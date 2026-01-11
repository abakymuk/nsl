import { NextRequest, NextResponse } from "next/server";
import { isAdmin, createUntypedAdminClient } from "@/lib/supabase/server";

const supabase = createUntypedAdminClient();

function generateTrackingNumber() {
  const prefix = "NSL";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      container_number,
      origin,
      destination,
      eta,
      customer_email,
      customer_name,
      notes,
      quote_id,
    } = body;

    // Generate tracking number
    const tracking_number = generateTrackingNumber();

    // Create shipment
    const { data: shipment, error } = await supabase
      .from("shipments")
      .insert({
        tracking_number,
        container_number,
        origin,
        destination,
        eta: eta || null,
        customer_email,
        customer_name,
        notes,
        quote_id: quote_id || null,
        status: "booked",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating shipment:", error);
      return NextResponse.json(
        { error: "Failed to create shipment" },
        { status: 500 }
      );
    }

    // Create initial event
    await supabase.from("shipment_events").insert({
      shipment_id: shipment.id,
      status: "booked",
      description: "Shipment booked and confirmed",
      location: origin,
    });

    // If created from a quote, update the quote status
    if (quote_id) {
      await supabase
        .from("quotes")
        .update({ status: "converted", shipment_id: shipment.id })
        .eq("id", quote_id);
    }

    return NextResponse.json({ success: true, shipment });
  } catch (error) {
    console.error("Error in POST /api/admin/shipments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching shipments:", error);
      return NextResponse.json(
        { error: "Failed to fetch shipments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ shipments: data });
  } catch (error) {
    console.error("Error in GET /api/admin/shipments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
