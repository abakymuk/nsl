import { NextRequest, NextResponse } from "next/server";
import { isAdmin, createUntypedAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const supabase = createUntypedAdminClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate tracking number: NSL + random alphanumeric
function generateTrackingNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "NSL";
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("loads")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching loads:", error);
      return NextResponse.json(
        { error: "Failed to fetch loads" },
        { status: 500 }
      );
    }

    return NextResponse.json({ loads: data });
  } catch (error) {
    console.error("Error in GET /api/admin/loads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      quote_id,
      container_number,
      container_size,
      origin,
      destination,
      customer_name,
      customer_email,
      eta,
      driver_name,
      truck_number,
      public_notes,
      internal_notes,
      status = "booked",
    } = body;

    // Validate required fields
    if (!container_number) {
      return NextResponse.json(
        { error: "Container number is required" },
        { status: 400 }
      );
    }

    // Generate tracking number
    const tracking_number = generateTrackingNumber();

    // Create load
    const { data: load, error: loadError } = await supabase
      .from("loads")
      .insert({
        quote_id,
        tracking_number,
        container_number,
        container_size,
        origin,
        destination,
        customer_name,
        customer_email,
        eta,
        driver_name,
        truck_number,
        public_notes,
        internal_notes,
        status,
      })
      .select()
      .single();

    if (loadError) {
      console.error("Error creating load:", loadError);
      return NextResponse.json(
        { error: "Failed to create load" },
        { status: 500 }
      );
    }

    // Create initial load event
    await supabase.from("load_events").insert({
      load_id: load.id,
      status: "booked",
      description: "Load created and booked",
      notes: quote_id ? "Created from accepted quote" : "Manually created",
    });

    // If created from quote, update quote status to completed
    if (quote_id) {
      await supabase
        .from("quotes")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", quote_id);
    }

    // Send tracking notification email if customer email provided
    if (customer_email) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@newstreamlogistics.com",
          to: customer_email,
          subject: `Load Booked - ${tracking_number} - New Stream Logistics`,
          text: `
Hello ${customer_name || "Valued Customer"},

Your load has been booked and is being processed!

LOAD DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tracking Number: ${tracking_number}
Container: ${container_number}
Origin: ${origin || "TBD"}
Destination: ${destination || "TBD"}
${eta ? `Estimated Arrival: ${new Date(eta).toLocaleDateString()}` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Track your load status in real-time at:
${process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com"}/track?number=${tracking_number}

We'll notify you of any status updates.

Thank you for choosing New Stream Logistics!

Best regards,
New Stream Logistics Team
(310) 555-1234
          `.trim(),
        });
      } catch (emailError) {
        console.error("Failed to send tracking email:", emailError);
      }
    }

    return NextResponse.json({ success: true, load }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/loads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
