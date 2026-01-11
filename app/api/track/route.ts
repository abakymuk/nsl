import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeContainerNumber } from "@/lib/sanitize";
import type { Quote } from "@/types/database";

// Base columns that always exist in the original schema
const BASE_SHIPMENT_COLUMNS = `
  id,
  container_number,
  status,
  created_at,
  updated_at,
  current_location,
  pickup_time,
  delivery_time,
  driver_name,
  public_notes
`;

// Base event columns that always exist
const BASE_EVENT_COLUMNS = `
  id,
  shipment_id,
  status,
  created_at,
  location,
  notes
`;

// Define a flexible shipment type that allows optional fields
interface TrackingShipment {
  id: string;
  container_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_location?: string | null;
  pickup_time?: string | null;
  delivery_time?: string | null;
  driver_name?: string | null;
  public_notes?: string | null;
  // Fields that may or may not exist depending on migrations
  tracking_number?: string | null;
  origin?: string | null;
  destination?: string | null;
  eta?: string | null;
  portpro_reference?: string | null;
  container_size?: string | null;
}

interface TrackingEvent {
  id: string;
  shipment_id: string;
  status: string;
  created_at: string;
  location?: string | null;
  notes?: string | null;
  description?: string | null;
  portpro_event?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = await checkRateLimit(request, "quote"); // Reuse quote limiter
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.reset);
    }

    // Get container number or tracking number from query params
    const { searchParams } = new URL(request.url);
    const containerNumber = searchParams.get("container");
    const trackingNumber = searchParams.get("number"); // NSL tracking number

    if (!containerNumber && !trackingNumber) {
      return NextResponse.json(
        { error: "Container number or tracking number is required" },
        { status: 400 }
      );
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Tracking service is currently unavailable" },
        { status: 503 }
      );
    }

    const supabase = createServerClient();
    let shipment: TrackingShipment | null = null;

    // Search by container number (most reliable - column always exists)
    if (containerNumber) {
      const sanitizedContainer = sanitizeContainerNumber(containerNumber);

      if (sanitizedContainer.length < 4) {
        return NextResponse.json(
          { error: "Invalid container number format" },
          { status: 400 }
        );
      }

      // First try with all columns (if migrations have been applied)
      const { data: shipmentData, error: shipmentError } = await supabase
        .from("shipments")
        .select("*")
        .eq("container_number", sanitizedContainer)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!shipmentError && shipmentData) {
        shipment = shipmentData as TrackingShipment;
      } else if (shipmentError) {
        // If error (likely column doesn't exist), try with base columns only
        console.log("Falling back to base columns due to error:", shipmentError.message);
        const { data: baseData } = await supabase
          .from("shipments")
          .select(BASE_SHIPMENT_COLUMNS)
          .eq("container_number", sanitizedContainer)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (baseData) {
          shipment = baseData as TrackingShipment;
        }
      }
    }

    // Search by tracking number if provided and no shipment found yet
    if (!shipment && trackingNumber) {
      const { data: shipmentData, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("tracking_number", trackingNumber.toUpperCase())
        .maybeSingle();

      // Only use this result if query succeeded (column exists)
      if (!error && shipmentData) {
        shipment = shipmentData as TrackingShipment;
      }
    }

    // If no shipment found, check for quotes
    if (!shipment) {
      // Only search quotes if we have a container number
      if (containerNumber) {
        const sanitizedContainer = sanitizeContainerNumber(containerNumber);
        const { data: quoteData, error: quoteError } = await supabase
          .from("quotes")
          .select("reference_number, status, created_at")
          .eq("container_number", sanitizedContainer)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!quoteError && quoteData) {
          const quote = quoteData as Pick<Quote, "reference_number" | "status" | "created_at">;
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
      }

      return NextResponse.json({
        success: true,
        found: false,
        message: "No shipment found. If you recently submitted a quote, please allow 1-2 hours for processing.",
      });
    }

    // Get shipment events - try full select first, fall back to base columns
    let events: TrackingEvent[] = [];
    const { data: eventsData, error: eventsError } = await supabase
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("created_at", { ascending: false });

    if (!eventsError && eventsData) {
      events = eventsData as TrackingEvent[];
    } else if (eventsError) {
      // Fall back to base columns
      const { data: baseEvents } = await supabase
        .from("shipment_events")
        .select(BASE_EVENT_COLUMNS)
        .eq("shipment_id", shipment.id)
        .order("created_at", { ascending: false });

      if (baseEvents) {
        events = baseEvents as TrackingEvent[];
      }
    }

    return NextResponse.json({
      success: true,
      found: true,
      type: "shipment",
      data: {
        trackingNumber: shipment.tracking_number || shipment.portpro_reference || `NSL-${shipment.id.substring(0, 8).toUpperCase()}`,
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
        // PortPro integration fields
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
