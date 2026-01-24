import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/auth";
import { Resend } from "resend";
import { getOrCreateAcceptToken, buildAcceptUrl } from "@/lib/quotes/tokens";
import { QuoteStatus, PricingBreakdown } from "@/types/database";

const resend = new Resend(process.env.RESEND_API_KEY);

// Valid status transitions
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  pending: ["in_review", "quoted", "cancelled"],
  in_review: ["quoted", "cancelled"],
  quoted: ["accepted", "rejected", "expired", "cancelled"],
  accepted: ["cancelled"],
  rejected: [],
  expired: [],
  cancelled: [],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await hasModuleAccess("quotes"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      status,
      quoted_price,
      pricing_breakdown,
      expires_at,
      quote_notes,
    } = body as {
      status?: QuoteStatus;
      quoted_price?: number;
      pricing_breakdown?: PricingBreakdown;
      expires_at?: string;
      quote_notes?: string;
    };

    const supabase = createUntypedAdminClient();
    const currentUser = await getUser();

    // Fetch current quote for validation and email
    const { data: currentQuote, error: fetchError } = await supabase
      .from("quotes")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !currentQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const currentStatus = (currentQuote.lifecycle_status || currentQuote.status) as QuoteStatus;

    // Validate status transition
    if (status && status !== currentStatus) {
      const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowedTransitions.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentStatus} to ${status}` },
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

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      updated_at: now,
    };

    if (status) {
      updateData.status = status;
      updateData.lifecycle_status = status;
    }

    if (quoted_price !== undefined) {
      updateData.quoted_price = quoted_price;
      updateData.quoted_at = now;
    }

    if (pricing_breakdown !== undefined) {
      updateData.pricing_breakdown = pricing_breakdown;
    }

    if (expires_at !== undefined) {
      updateData.expires_at = expires_at;
    }

    if (quote_notes !== undefined) {
      updateData.quote_notes = quote_notes;
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

    // Create audit log entry
    if (status && status !== currentStatus) {
      await supabase.from("quote_audit_log").insert({
        quote_id: id,
        action: status === "quoted" ? "quoted" : `status_changed_to_${status}`,
        old_status: currentStatus,
        new_status: status,
        actor_id: currentUser?.id || null,
        actor_type: "admin",
        metadata: {
          quoted_price: quoted_price || null,
          pricing_breakdown: pricing_breakdown || null,
        },
      });
    }

    let acceptUrl: string | null = null;

    // Send email notification when quote is sent
    if (status === "quoted" && currentQuote.email) {
      // Generate accept token and URL
      const acceptToken = await getOrCreateAcceptToken(id);
      if (acceptToken) {
        acceptUrl = buildAcceptUrl(acceptToken);
      }

      const price = quoted_price || currentQuote.quoted_price;
      const validUntil = expires_at
        ? new Date(expires_at).toLocaleDateString()
        : "7 days from now";

      // Build pricing breakdown for email
      let pricingDetails = "";
      if (pricing_breakdown?.items) {
        pricingDetails = pricing_breakdown.items
          .map((item: PricingBreakdown["items"][0]) => `${item.description}: $${item.amount.toFixed(2)}`)
          .join("\n");
        if (pricing_breakdown.fees?.length) {
          pricingDetails +=
            "\n" +
            pricing_breakdown.fees
              .map((fee: NonNullable<PricingBreakdown["fees"]>[0]) => `${fee.description}: $${fee.amount.toFixed(2)}`)
              .join("\n");
        }
        pricingDetails += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nTOTAL: $${pricing_breakdown.total.toFixed(2)}`;
      } else {
        pricingDetails = `QUOTED PRICE: $${price?.toLocaleString()}`;
      }

      try {
        const emailText = `
Hello ${currentQuote.contact_name || "Valued Customer"},

Great news! Your quote request has been processed.

QUOTE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reference: ${currentQuote.reference_number}
Container: ${currentQuote.container_number || "N/A"}
Terminal: ${currentQuote.pickup_terminal || currentQuote.pickup_location || "N/A"}
Delivery: ${currentQuote.delivery_zip || currentQuote.delivery_location || "N/A"}

${pricingDetails}

Valid Until: ${validUntil}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${acceptUrl ? `ACCEPT OR DECLINE THIS QUOTE:\n${acceptUrl}\n\nOr you can ` : "To accept this quote, "}reply to this email or call us at (888) 533-0302.
${quote_notes ? `\nNOTES:\n${quote_notes}\n` : ""}
You can also track your quote status anytime at:
${process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com"}/quote/status/${currentQuote.status_token || ""}

Thank you for choosing New Stream Logistics!

Best regards,
New Stream Logistics Team
(888) 533-0302
info@newstreamlogistics.com
        `.trim();

        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@newstreamlogistics.com",
          to: currentQuote.email,
          subject: `Quote Ready - ${currentQuote.reference_number} - New Stream Logistics`,
          text: emailText,
        });
        console.log(`Quote email sent to ${currentQuote.email}`);
      } catch (emailError) {
        console.error("Failed to send quote email:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Send email notification when quote is accepted (manual)
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
Container: ${currentQuote.container_number || "N/A"}
Price: $${currentQuote.quoted_price?.toLocaleString() || "N/A"}

Our team will now begin processing your load. You'll receive tracking information shortly.

Track your load status at:
${process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com"}/track?number=${currentQuote.container_number || currentQuote.reference_number}

Thank you for your business!

Best regards,
New Stream Logistics Team
          `.trim(),
        });
      } catch (emailError) {
        console.error("Failed to send acceptance email:", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      quote: data,
      acceptUrl,
    });
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
    if (!(await hasModuleAccess("quotes"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createUntypedAdminClient();

    const { data, error } = await supabase
      .from("quotes")
      .select(
        `
        *,
        assignee:profiles!assignee_id (
          id,
          full_name,
          email
        )
      `
      )
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
