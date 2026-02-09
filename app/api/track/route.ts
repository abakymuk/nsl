import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Rate limit tracking requests
    const rateLimit = await checkRateLimit(request, "track");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.reset);
    }

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
        { error: "Failed to look up shipment" },
        { status: 500 }
      );
    }

    if (shipments && shipments.length > 0) {
      const shipment = shipments[0];

      // Get events - include enhanced tracking fields from migration 012
      // Order by move_number and stop_number for logical sequence
      const { data: events } = await supabase
        .from("load_events")
        .select("id, status, event_type, stop_type, move_number, stop_number, location, notes, description, location_name, location_address, arrival_time, created_at")
        .eq("load_id", shipment.id)
        .order("move_number", { ascending: true, nullsFirst: true })
        .order("stop_number", { ascending: true, nullsFirst: true })
        .order("created_at", { ascending: true });

      // Map stop_type to customer-friendly status
      const stopTypeToStatus: Record<string, string> = {
        pickup: "picked_up",
        hook: "picked_up",
        drop: "out_for_delivery",
        deliver: "delivered",
        return: "delivered",
        yard: "booked",      // Chassis operations are prep work
        terminal: "at_port",
      };

      // Filter and transform events for customer display
      // Only show "stop" events (not move_start which are internal)
      // Also include legacy status_update events
      const customerEvents = (events || [])
        .filter((e: { event_type: string | null }) =>
          e.event_type === "stop" || e.event_type === "status_update" || !e.event_type
        )
        .map((e: {
          status: string;
          event_type: string | null;
          stop_type: string | null;
          location: string | null;
          notes: string | null;
          description: string | null;
          location_name: string | null;
          location_address: string | null;
          arrival_time: string | null;
          created_at: string;
        }) => {
          // Determine display status: use stop_type mapping, fall back to event status
          let displayStatus = e.status;
          if (e.stop_type && stopTypeToStatus[e.stop_type]) {
            displayStatus = stopTypeToStatus[e.stop_type];
          } else if (!e.stop_type && e.description) {
            // Fallback: infer from description for legacy data without stop_type
            const desc = e.description.toUpperCase();
            if (desc.includes("CHASSISPICK") || desc.includes("CHASSIS PICK")) {
              displayStatus = "booked";
            } else if (desc.includes("PICK UP") || desc.includes("PULL")) {
              displayStatus = "picked_up";
            } else if (desc.includes("DELIVER") || desc.includes("UNLOAD")) {
              displayStatus = "delivered";
            } else if (desc.includes("DROP")) {
              displayStatus = "out_for_delivery";
            } else if (desc.includes("RETURN")) {
              displayStatus = "delivered";
            } else if (desc.includes("HOOK")) {
              displayStatus = "picked_up";
            }
          }

          return {
            status: displayStatus,
            location: e.location_name || e.location_address || e.location,
            notes: e.description || e.notes,
            // Use arrival_time if available (actual event time), fall back to created_at
            timestamp: e.arrival_time || e.created_at,
          };
        })
        // Reverse to show most recent first
        .reverse();

      const response = NextResponse.json({
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
          events: customerEvents,
        },
      });
      // Cache tracking data for 5 minutes
      response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
      return response;
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
      message: "No shipment found. If you recently submitted a quote, please allow 15 minutes for processing.",
    });

  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
