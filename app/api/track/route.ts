import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    // Get container number from query params
    const { searchParams } = new URL(request.url);
    const containerNumber = searchParams.get("container");

    if (!containerNumber) {
      return NextResponse.json(
        { error: "Container number is required" },
        { status: 400 }
      );
    }

    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase env vars:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
      return NextResponse.json(
        { error: "Tracking service is currently unavailable" },
        { status: 503 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Sanitize container number (basic)
    const sanitized = containerNumber.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (sanitized.length < 4) {
      return NextResponse.json(
        { error: "Invalid container number format" },
        { status: 400 }
      );
    }

    // Query shipments - try container number first, then tracking number
    let shipments;
    let shipmentError;

    // Try container number first
    const containerResult = await supabase
      .from("loads")
      .select("id, tracking_number, container_number, container_size, status, created_at, updated_at, current_location, origin, destination, pickup_time, delivery_time, eta, driver_name, weight, seal_number, chassis_number, public_notes")
      .eq("container_number", sanitized)
      .order("created_at", { ascending: false })
      .limit(1);

    shipments = containerResult.data;
    shipmentError = containerResult.error;

    // If not found by container, try tracking number
    if (!shipments || shipments.length === 0) {
      const trackingResult = await supabase
        .from("loads")
        .select("id, tracking_number, container_number, container_size, status, created_at, updated_at, current_location, origin, destination, pickup_time, delivery_time, eta, driver_name, weight, seal_number, chassis_number, public_notes")
        .eq("tracking_number", sanitized)
        .order("created_at", { ascending: false })
        .limit(1);

      shipments = trackingResult.data;
      shipmentError = trackingResult.error;
    }

    if (shipmentError) {
      console.error("Supabase shipment error:", shipmentError);
      return NextResponse.json(
        { error: "Database query failed", details: shipmentError.message },
        { status: 500 }
      );
    }

    if (shipments && shipments.length > 0) {
      const shipment = shipments[0];

      // Get events
      const { data: events } = await supabase
        .from("load_events")
        .select("id, status, location, notes, created_at")
        .eq("load_id", shipment.id)
        .order("created_at", { ascending: false });

      return NextResponse.json({
        success: true,
        found: true,
        type: "load",
        data: {
          trackingNumber: shipment.tracking_number || `NSL-${String(shipment.id).substring(0, 8).toUpperCase()}`,
          containerNumber: shipment.container_number,
          containerSize: shipment.container_size,
          status: shipment.status,
          currentLocation: shipment.current_location,
          origin: shipment.origin,
          destination: shipment.destination,
          pickupTime: shipment.pickup_time,
          deliveryTime: shipment.delivery_time,
          eta: shipment.eta,
          driverName: shipment.driver_name,
          weight: shipment.weight,
          sealNumber: shipment.seal_number,
          chassisNumber: shipment.chassis_number,
          publicNotes: shipment.public_notes,
          lastUpdate: shipment.updated_at,
          events: (events || []).map((e: { status: string; location: string | null; notes: string | null; created_at: string }) => ({
            status: e.status,
            location: e.location,
            notes: e.notes,
            timestamp: e.created_at,
          })),
        },
      });
    }

    // Check quotes
    const { data: quotes, error: quoteError } = await supabase
      .from("quotes")
      .select("reference_number, status, created_at")
      .eq("container_number", sanitized)
      .order("created_at", { ascending: false })
      .limit(1);

    if (quoteError) {
      console.error("Supabase quote error:", quoteError);
    }

    if (quotes && quotes.length > 0) {
      const quote = quotes[0];
      return NextResponse.json({
        success: true,
        found: true,
        type: "quote",
        data: {
          containerNumber: sanitized,
          status: "quote_" + quote.status,
          referenceNumber: quote.reference_number,
          message: getQuoteStatusMessage(quote.status),
          lastUpdate: quote.created_at,
        },
      });
    }

    return NextResponse.json({
      success: true,
      found: false,
      message: "No shipment found. If you recently submitted a quote, please allow 1-2 hours for processing.",
    });

  } catch (error) {
    console.error("Tracking API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}

function getQuoteStatusMessage(status: string): string {
  switch (status) {
    case "pending":
      return "Your quote request is being reviewed.";
    case "quoted":
      return "We've sent you a quote. Please check your email.";
    case "accepted":
      return "Your quote has been accepted.";
    case "completed":
      return "This load has been completed.";
    case "cancelled":
      return "This quote was cancelled.";
    default:
      return "Quote is being processed.";
  }
}
