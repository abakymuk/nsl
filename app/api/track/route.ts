import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeContainerNumber } from "@/lib/sanitize";

// Use untyped client for tracking to avoid schema mismatch issues
function createTrackingClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = await checkRateLimit(request, "quote");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.reset);
    }

    // Get container number from query params
    const { searchParams } = new URL(request.url);
    const containerNumber = searchParams.get("container");
    const trackingNumber = searchParams.get("number");

    if (!containerNumber && !trackingNumber) {
      return NextResponse.json(
        { error: "Container number or tracking number is required" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createTrackingClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Tracking service is currently unavailable" },
        { status: 503 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shipment: any = null;

    // Search by container number first (most reliable)
    if (containerNumber) {
      const sanitizedContainer = sanitizeContainerNumber(containerNumber);

      if (sanitizedContainer.length < 4) {
        return NextResponse.json(
          { error: "Invalid container number format" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("container_number", sanitizedContainer)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Shipment query error:", error);
      } else if (data && data.length > 0) {
        shipment = data[0];
      }
    }

    // If not found and tracking number provided, try that
    if (!shipment && trackingNumber) {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("tracking_number", trackingNumber.toUpperCase())
        .limit(1);

      // Ignore errors (column might not exist)
      if (!error && data && data.length > 0) {
        shipment = data[0];
      }
    }

    // If no shipment found, check for quotes
    if (!shipment && containerNumber) {
      const sanitizedContainer = sanitizeContainerNumber(containerNumber);

      const { data: quoteData, error: quoteError } = await supabase
        .from("quotes")
        .select("reference_number, status, created_at")
        .eq("container_number", sanitizedContainer)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!quoteError && quoteData && quoteData.length > 0) {
        const quote = quoteData[0];
        return NextResponse.json({
          success: true,
          found: true,
          type: "quote",
          data: {
            containerNumber: sanitizedContainer,
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
    }

    if (!shipment) {
      return NextResponse.json({
        success: true,
        found: false,
        message: "No shipment found. If you recently submitted a quote, please allow 1-2 hours for processing.",
      });
    }

    // Get shipment events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let events: any[] = [];
    const { data: eventsData, error: eventsError } = await supabase
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("created_at", { ascending: false });

    if (!eventsError && eventsData) {
      events = eventsData;
    }

    // Build response with safe property access
    return NextResponse.json({
      success: true,
      found: true,
      type: "shipment",
      data: {
        trackingNumber: shipment.tracking_number || shipment.portpro_reference || `NSL-${String(shipment.id).substring(0, 8).toUpperCase()}`,
        containerNumber: shipment.container_number,
        status: shipment.status,
        origin: shipment.origin || null,
        destination: shipment.destination || null,
        eta: shipment.eta || null,
        currentLocation: shipment.current_location || null,
        pickupTime: shipment.pickup_time || null,
        deliveryTime: shipment.delivery_time || null,
        driverName: shipment.driver_name || null,
        publicNotes: shipment.public_notes || null,
        lastUpdate: shipment.updated_at,
        portproReference: shipment.portpro_reference || null,
        containerSize: shipment.container_size || null,
        events: events.map((e) => ({
          status: e.status,
          location: e.location || null,
          description: e.description || null,
          notes: e.notes || null,
          timestamp: e.created_at,
          fromPortPro: e.portpro_event || false,
        })),
      },
    });
  } catch (error) {
    console.error("Error tracking shipment:", error);

    // Return more detailed error in development
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Detailed error:", errorMessage);

    return NextResponse.json(
      { error: "Failed to track shipment. Please try again later." },
      { status: 500 }
    );
  }
}

function getQuoteStatusMessage(status: string): string {
  switch (status) {
    case "pending":
      return "Your quote request is being reviewed. We'll get back to you within 1-2 hours.";
    case "quoted":
      return "We've sent you a quote. Please check your email.";
    case "accepted":
      return "Your quote has been accepted. We're preparing your shipment.";
    case "completed":
      return "This shipment has been completed.";
    case "cancelled":
      return "This quote was cancelled.";
    default:
      return "Quote is being processed.";
  }
}
