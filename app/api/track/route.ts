import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeContainerNumber } from "@/lib/sanitize";
import type { Quote } from "@/types/database";

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

    // Search by tracking number first (NSL tracking number)
    if (trackingNumber) {
      try {
        const { data: shipmentData } = await supabase
          .from("shipments")
          .select("*")
          .eq("tracking_number", trackingNumber.toUpperCase())
          .single();

        shipment = shipmentData as TrackingShipment | null;
      } catch {
        // tracking_number column may not exist yet, continue with container search
      }
    }

    // If not found by tracking number, search by container number
    if (!shipment && containerNumber) {
      const sanitizedContainer = sanitizeContainerNumber(containerNumber);

      if (sanitizedContainer.length < 4) {
        return NextResponse.json(
          { error: "Invalid container number format" },
          { status: 400 }
        );
      }

      const { data: shipmentData, error: shipmentError } = await supabase
        .from("shipments")
        .select("*")
        .eq("container_number", sanitizedContainer)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!shipmentError && shipmentData) {
        shipment = shipmentData as TrackingShipment;
      }

      // Also search by PortPro reference if not found
      if (!shipment) {
        try {
          const { data: portproData } = await supabase
            .from("shipments")
            .select("*")
            .eq("portpro_reference", sanitizedContainer)
            .single();

          if (portproData) {
            shipment = portproData as TrackingShipment;
          }
        } catch {
          // portpro_reference column may not exist yet
        }
      }
    }

    // If no shipment found, check for quotes
    if (!shipment) {
      // Only search quotes if we have a container number
      if (containerNumber) {
        const sanitizedContainer = sanitizeContainerNumber(containerNumber);
        const { data: quoteData } = await supabase
          .from("quotes")
          .select("reference_number, status, created_at")
          .eq("container_number", sanitizedContainer)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const quote = quoteData as Pick<Quote, "reference_number" | "status" | "created_at"> | null;

        if (quote) {
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

    // Get shipment events
    const { data: eventsData } = await supabase
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("created_at", { ascending: false });

    const events = eventsData as TrackingEvent[] | null;

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
        events: events?.map((e) => ({
          status: e.status,
          location: e.location || null,
          description: e.description || null,
          notes: e.notes || null,
          timestamp: e.created_at,
          fromPortPro: e.portpro_event || false,
        })) || [],
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
