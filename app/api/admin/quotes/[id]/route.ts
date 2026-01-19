import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { Resend } from "resend";

const supabase = createUntypedAdminClient();
const resend = new Resend(process.env.RESEND_API_KEY);

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["quoted", "rejected", "cancelled"],
  quoted: ["accepted", "rejected", "cancelled"],
  accepted: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, quoted_price, quote_notes, quote_valid_until } = body;

    // Fetch current quote for validation and email
    const { data: currentQuote, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !currentQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Validate status transition
    if (status && status !== currentQuote.status) {
      const allowedTransitions = VALID_TRANSITIONS[currentQuote.status] || [];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentQuote.status} to ${status}` },
          { status: 400 }
        );
      }

      // Require price when moving to "quoted"
      if (status === "quoted" && !quoted_price && !currentQuote.quoted_price) {
        return NextResponse.json(
          { error: "Price is required when sending quote" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;
    }

    if (quoted_price !== undefined) {
      updateData.quoted_price = quoted_price;
      updateData.quoted_at = new Date().toISOString();
    }

    if (quote_notes !== undefined) {
      updateData.quote_notes = quote_notes;
    }

    if (quote_valid_until !== undefined) {
      updateData.quote_valid_until = quote_valid_until;
    }

    const { data, error } = await supabase
      .from("quotes")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating quote:", error);
      return NextResponse.json(
        { error: "Failed to update quote" },
        { status: 500 }
      );
    }

    // Send email notification when quote price is sent
    if (status === "quoted" && currentQuote.email) {
      const price = quoted_price || currentQuote.quoted_price;
      const validUntil = quote_valid_until
        ? new Date(quote_valid_until).toLocaleDateString()
        : "7 days from now";

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@newstreamlogistics.com",
          to: currentQuote.email,
          subject: `Quote Ready - ${currentQuote.reference_number} - New Stream Logistics`,
          text: `
Hello ${currentQuote.contact_name || "Valued Customer"},

Great news! Your quote request has been processed.

QUOTE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reference: ${currentQuote.reference_number}
Container: ${currentQuote.container_number}
Terminal: ${currentQuote.pickup_terminal}
Delivery: ${currentQuote.delivery_zip}

QUOTED PRICE: $${price.toLocaleString()}
Valid Until: ${validUntil}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To accept this quote, please reply to this email or call us at (888) 533-0302.

You can also track your quote status anytime at:
${process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com"}/track?number=${currentQuote.container_number}

Thank you for choosing New Stream Logistics!

Best regards,
New Stream Logistics Team
(888) 533-0302
info@newstreamlogistics.com
          `.trim(),
        });
        console.log(`Quote email sent to ${currentQuote.email}`);
      } catch (emailError) {
        console.error("Failed to send quote email:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Send email notification when quote is accepted
    if (status === "accepted" && currentQuote.email) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@newstreamlogistics.com",
          to: currentQuote.email,
          subject: `Quote Accepted - ${currentQuote.reference_number} - New Stream Logistics`,
          text: `
Hello ${currentQuote.contact_name || "Valued Customer"},

Your quote has been marked as accepted!

Reference: ${currentQuote.reference_number}
Container: ${currentQuote.container_number}
Price: $${currentQuote.quoted_price?.toLocaleString() || "N/A"}

Our team will now begin processing your load. You'll receive tracking information shortly.

Track your load status at:
${process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com"}/track?number=${currentQuote.container_number}

Thank you for your business!

Best regards,
New Stream Logistics Team
          `.trim(),
        });
      } catch (emailError) {
        console.error("Failed to send acceptance email:", emailError);
      }
    }

    return NextResponse.json({ success: true, quote: data });
  } catch (error) {
    console.error("Error in PATCH /api/admin/quotes/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching quote:", error);
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ quote: data });
  } catch (error) {
    console.error("Error in GET /api/admin/quotes/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
