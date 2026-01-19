import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  quoteFormSchema,
  calculateLeadScore,
  isUrgentLead,
  REQUEST_TYPES,
} from "@/lib/validations/quote";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { QuoteInsert } from "@/types/database";

// Simple sanitizer (avoid isomorphic-dompurify issues on serverless)
function sanitizeString(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>"'&]/g, "") // Remove special chars
    .trim();
}

function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    const value = result[key];
    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    }
  }
  return result;
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

export async function POST(request: NextRequest) {
  console.log("[QUOTE API] Request received");

  try {
    // Check rate limit
    const rateLimit = await checkRateLimit(request, "quote");
    if (!rateLimit.success) {
      console.log("[QUOTE API] Rate limited");
      return rateLimitResponse(rateLimit.reset);
    }

    // Parse and sanitize input
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);

    // Validate with Zod schema
    const parseResult = quoteFormSchema.safeParse(sanitizedBody);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));

      return NextResponse.json(
        { error: "Validation failed", errors },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    let referenceNumber: string | null = null;

    // Calculate lead score and urgency
    const leadScore = calculateLeadScore(body);
    const isUrgent = isUrgentLead(leadScore, body);

    // Get request type label for display
    const requestTypeLabel =
      REQUEST_TYPES.find((r) => r.value === body.requestType)?.label ||
      body.requestType;

    // Build special instructions from new fields
    const specialInstructions: string[] = [];
    if (body.requestType && body.requestType !== "standard") {
      specialInstructions.push(`Request Type: ${requestTypeLabel}`);
    }
    if (body.timeSensitive) {
      specialInstructions.push("TIME-SENSITIVE - Penalties may apply");
    }
    if (body.deliveryType) {
      specialInstructions.push(`Delivery Type: ${body.deliveryType}`);
    }
    if (body.appointmentRequired) {
      specialInstructions.push("Appointment required at delivery");
    }
    if (body.availabilityDate) {
      specialInstructions.push(`Available Date: ${body.availabilityDate}`);
    }
    if (body.commodityType) {
      specialInstructions.push(`Commodity: ${body.commodityType}`);
    }
    if (body.notes) {
      specialInstructions.push(`Notes: ${body.notes}`);
    }

    // Save to database if Supabase is configured
    const supabaseConfigured = isSupabaseConfigured();
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasSupabaseConfig = supabaseConfigured && hasServiceKey;

    console.log("[QUOTE API] DB config check:", {
      supabaseConfigured,
      hasServiceKey,
      hasSupabaseConfig,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });

    if (hasSupabaseConfig) {
      try {
        console.log("[QUOTE API] Creating admin client...");
        const supabase = createAdminClient();
        console.log("[QUOTE API] Admin client created");

        const quoteData: QuoteInsert = {
          // Contact info
          contact_name: body.fullName,
          company_name: body.companyName,
          email: body.email || null,
          phone: body.phone,
          // Container details
          container_number: body.containerNumber || null,
          container_type: body.containerType || "40ft",
          pickup_terminal: body.terminal || null,
          // Delivery
          delivery_zip: body.deliveryZip,
          delivery_type: body.deliveryType || null,
          appointment_required: body.appointmentRequired || false,
          // Service details
          service_type: body.moveType || "import",
          lfd: body.lfd || null,
          availability_date: body.availabilityDate || null,
          special_instructions:
            specialInstructions.length > 0
              ? specialInstructions.join("\n")
              : null,
          // Lead qualification (new fields)
          port: body.port || "la",
          request_type: body.requestType || "standard",
          time_sensitive: body.timeSensitive || false,
          lead_score: leadScore,
          is_urgent: isUrgent,
          // Status (use 'pending' for all new quotes, is_urgent field tracks urgency)
          status: "pending",
        };

        console.log("[QUOTE API] Inserting quote data:", JSON.stringify(quoteData, null, 2));

        const { data: quote, error: dbError } = await supabase
          .from("quotes")
          .insert(quoteData as never)
          .select("reference_number")
          .single();

        console.log("[QUOTE API] Insert result:", { quote, dbError });

        if (dbError) {
          console.error("[QUOTE API] Database error inserting quote:", {
            code: dbError.code,
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
          });
          // Continue with email even if DB fails
        } else if (quote) {
          referenceNumber =
            (quote as { reference_number: string }).reference_number || null;
          console.log("[QUOTE API] Quote saved to database:", referenceNumber);
        }
      } catch (dbException) {
        console.error("[QUOTE API] Exception during database insert:", dbException);
        // Continue with email even if DB fails
      }
    } else {
      console.warn("[QUOTE API] Database save skipped - missing SUPABASE_SERVICE_ROLE_KEY or Supabase not configured");
    }

    // Build email body with lead scoring info
    const urgencyBadge = isUrgent ? "*** URGENT - PRIORITY RESPONSE NEEDED ***\n\n" : "";
    const leadScoreInfo = `Lead Score: ${leadScore} ${isUrgent ? "(URGENT)" : "(Standard)"}`;

    const emailBody = `
${urgencyBadge}New Quote Request${referenceNumber ? ` - ${referenceNumber}` : ""}
${leadScoreInfo}

REQUEST DETAILS
---------------
Type: ${requestTypeLabel}
Port: ${body.port === "la" ? "Los Angeles" : "Long Beach"}
${body.timeSensitive ? "*** TIME-SENSITIVE - Penalties may apply ***" : ""}

CONTACT INFORMATION
-------------------
Name: ${body.fullName}
Company: ${body.companyName}
Phone: ${body.phone}
${body.email ? `Email: ${body.email}` : "Email: Not provided"}

CONTAINER & PICKUP
------------------
Container Number: ${body.containerNumber || "Not provided yet"}
Terminal: ${body.terminal || "Not selected"}
${body.lfd ? `Last Free Day (LFD): ${body.lfd}` : ""}
${body.availabilityDate ? `Available Date: ${body.availabilityDate}` : ""}

DELIVERY
--------
ZIP Code: ${body.deliveryZip}
Delivery Type: ${body.deliveryType || "Not specified"}
${body.appointmentRequired ? "Appointment required: Yes" : ""}

${body.notes ? `ADDITIONAL NOTES\n----------------\n${body.notes}` : ""}

---
Submitted at: ${new Date().toISOString()}
    `.trim();

    // Build email subject with urgency indicator
    const urgencyPrefix = isUrgent ? "[URGENT] " : "";
    const containerInfo = body.containerNumber || "No Container";
    const emailSubject = `${urgencyPrefix}Quote Request - ${containerInfo}${referenceNumber ? ` (${referenceNumber})` : ""} - ${body.companyName}`;

    // Send email via Resend
    const emailTo = process.env.EMAIL_TO || "vlad@newstreamlogistics.com";
    const emailFrom = process.env.EMAIL_FROM || "quotes@newstreamlogistics.com";

    const resend = getResend();
    await resend.emails.send({
      from: emailFrom,
      to: emailTo,
      replyTo: body.email || undefined,
      subject: emailSubject,
      text: emailBody,
    });

    // Send Slack notification for all quotes
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        const slackBlocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: isUrgent ? "🚨 URGENT Quote Request" : "📋 New Quote Request",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Reference:*\n${referenceNumber || "Pending"}` },
              { type: "mrkdwn", text: `*Lead Score:*\n${leadScore} ${isUrgent ? "🔥" : ""}` },
              { type: "mrkdwn", text: `*Company:*\n${body.companyName}` },
              { type: "mrkdwn", text: `*Contact:*\n${body.fullName}` },
              { type: "mrkdwn", text: `*Phone:*\n<tel:${body.phone}|${body.phone}>` },
              { type: "mrkdwn", text: `*Request Type:*\n${requestTypeLabel}` },
            ],
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Port:*\n${body.port === "la" ? "Los Angeles" : "Long Beach"}` },
              { type: "mrkdwn", text: `*Container:*\n${body.containerNumber || "TBD"}` },
              { type: "mrkdwn", text: `*Terminal:*\n${body.terminal || "TBD"}` },
              { type: "mrkdwn", text: `*Delivery ZIP:*\n${body.deliveryZip}` },
            ],
          },
        ];

        // Add LFD warning if present and soon
        if (body.lfd) {
          slackBlocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `⏰ *Last Free Day:* ${body.lfd}`,
            },
          } as never);
        }

        // Add notes if present
        if (body.notes) {
          slackBlocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Notes:* ${body.notes}`,
            },
          } as never);
        }

        // Add call button for urgent
        if (isUrgent) {
          slackBlocks.push({
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: `📞 Call ${body.phone}`, emoji: true },
                url: `tel:${body.phone}`,
                style: "danger",
              },
            ],
          } as never);
        }

        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks: slackBlocks }),
        });
      } catch (slackError) {
        console.error("Slack notification failed:", slackError);
        // Don't fail the request if Slack fails
      }
    }

    console.log("[QUOTE API] Success - returning response with ref:", referenceNumber);
    return NextResponse.json({
      success: true,
      message: "Quote request submitted successfully",
      referenceNumber,
      leadScore,
      isUrgent,
    });
  } catch (error) {
    console.error("[QUOTE API] Error processing quote request:", error);

    // Don't expose internal error details to client
    return NextResponse.json(
      { error: "Failed to process quote request. Please try again later." },
      { status: 500 }
    );
  }
}
