import { NextRequest, NextResponse } from "next/server";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeContainerNumber } from "@/lib/sanitize";
import type { Shipment, ShipmentEvent, Quote } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = await checkRateLimit(request, "quote"); // Reuse quote limiter
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

    // Sanitize input
    const sanitizedContainer = sanitizeContainerNumber(containerNumber);

    if (sanitizedContainer.length < 4) {
      return NextResponse.json(
        { error: "Invalid container number format" },
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

    // Look up shipment by container number
    const { data: shipmentData, error: shipmentError } = await supabase
      .from("shipments")
      .select("*")
      .eq("container_number", sanitizedContainer)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const shipment = shipmentData as Shipment | null;

    if (shipmentError || !shipment) {
      // Check if there's a quote for this container
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

      return NextResponse.json({
        success: true,
        found: false,
        message: "No shipment found for this container number. If you recently submitted a quote, please allow 1-2 hours for processing.",
      });
    }

    // Get shipment events
    const { data: eventsData } = await supabase
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", shipment.id)
      .order("created_at", { ascending: false });

    const events = eventsData as ShipmentEvent[] | null;

    return NextResponse.json({
      success: true,
      found: true,
      type: "shipment",
      data: {
        containerNumber: shipment.container_number,
        status: shipment.status,
        currentLocation: shipment.current_location,
        pickupTime: shipment.pickup_time,
        deliveryTime: shipment.delivery_time,
        driverName: shipment.driver_name,
        publicNotes: shipment.public_notes,
        lastUpdate: shipment.updated_at,
        events: events?.map((e) => ({
          status: e.status,
          location: e.location,
          notes: e.notes,
          timestamp: e.created_at,
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
