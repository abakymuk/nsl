import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/auth";
import { Resend } from "resend";
import { getOrCreateAcceptToken, getOrCreateStatusToken, buildAcceptUrl, buildStatusUrl, buildTrackingPixelUrl } from "@/lib/quotes/tokens";
import { logQuoteActivity, notify } from "@/lib/notifications";
import { QuoteStatus, PricingBreakdown } from "@/types/database";

// Lazy initialization to avoid module-scope env var access
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

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
    let statusUrl: string | null = null;

    // Send email notification when quote is sent
    if (status === "quoted" && currentQuote.email) {
      // Generate accept token and URL
      const acceptToken = await getOrCreateAcceptToken(id);
      if (acceptToken) {
        acceptUrl = buildAcceptUrl(acceptToken);
      }

      // Generate status token and URL
      const statusToken = await getOrCreateStatusToken(id);
      let trackingPixelUrl: string | null = null;
      if (statusToken) {
        statusUrl = buildStatusUrl(statusToken);
        trackingPixelUrl = buildTrackingPixelUrl(statusToken);
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
${quote_notes ? `\nNOTES:\n${quote_notes}\n` : ""}${statusUrl ? `You can also track your quote status anytime at:\n${statusUrl}` : ""}

Thank you for choosing New Stream Logistics!

Best regards,
New Stream Logistics Team
(888) 533-0302
info@newstreamlogistics.com
        `.trim();

        // Build HTML email with tracking pixel
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">Hello ${currentQuote.contact_name || "Valued Customer"},</h2>
  <p>Great news! Your quote request has been processed.</p>

  <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1a1a1a;">Quote Details</h3>
    <p><strong>Reference:</strong> ${currentQuote.reference_number}</p>
    <p><strong>Container:</strong> ${currentQuote.container_number || "N/A"}</p>
    <p><strong>Terminal:</strong> ${currentQuote.pickup_terminal || currentQuote.pickup_location || "N/A"}</p>
    <p><strong>Delivery:</strong> ${currentQuote.delivery_zip || currentQuote.delivery_location || "N/A"}</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
    <p style="font-size: 24px; font-weight: bold; color: #22c55e; margin: 0;">$${price?.toLocaleString() || "N/A"}</p>
    <p style="color: #666; margin-top: 5px;">Valid Until: ${validUntil}</p>
  </div>

  ${acceptUrl ? `
  <div style="text-align: center; margin: 30px 0;">
    <a href="${acceptUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept or Decline Quote</a>
  </div>
  ` : ""}

  ${quote_notes ? `<p><strong>Notes:</strong> ${quote_notes}</p>` : ""}

  ${statusUrl ? `<p>Track your quote status anytime: <a href="${statusUrl}">${statusUrl}</a></p>` : ""}

  <p>Or reply to this email or call us at <a href="tel:+18885330302">(888) 533-0302</a>.</p>

  <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
  <p style="color: #666; font-size: 14px;">
    Thank you for choosing New Stream Logistics!<br>
    <strong>New Stream Logistics Team</strong><br>
    (888) 533-0302 | info@newstreamlogistics.com
  </p>
  ${trackingPixelUrl ? `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;">` : ""}
</body>
</html>
        `.trim();

        const emailResult = await getResend().emails.send({
          from: process.env.EMAIL_FROM || "noreply@newstreamlogistics.com",
          to: currentQuote.email,
          subject: `Quote Ready - ${currentQuote.reference_number} - New Stream Logistics`,
          text: emailText,
          html: emailHtml,
        });
        console.log(`Quote email sent to ${currentQuote.email}`, emailResult);

        // Log email sent activity
        await logQuoteActivity(id, "email_sent", {
          metadata: { email: currentQuote.email },
          skipNotification: true, // Don't notify on email sent (admin initiated)
        });

        // Notify employees that quote was sent to customer
        notify("quote_sent", id, {
          reference: currentQuote.reference_number,
          contact_name: currentQuote.contact_name,
          amount: quoted_price || currentQuote.quoted_price,
          customer_email: currentQuote.email,
        }).catch((err) => {
          console.error("Failed to send quote_sent notification:", err);
        });
      } catch (emailError) {
        console.error("Failed to send quote email:", emailError);
        // Return success but include email error so admin knows
        return NextResponse.json({
          success: true,
          quote: data,
          acceptUrl,
          emailError: emailError instanceof Error ? emailError.message : "Failed to send email to customer",
        });
      }
    }

    // Send email notification when quote is accepted (manual)
    if (status === "accepted" && currentQuote.email) {
      try {
        await getResend().emails.send({
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
