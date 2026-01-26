import { NextRequest, NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/validations/contact";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getResendOptional } from "@/lib/resend";
import type { ContactInsert } from "@/types/database";

// Simple server-safe sanitization (no jsdom dependency)
function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/[<>]/g, "") // Remove any remaining angle brackets
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


// Send notification to Slack
async function sendSlackNotification(body: {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  subject?: string | null;
  message: string;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL is not configured - Slack notification skipped");
    return;
  }

  const slackMessage = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📩 New Contact Form Submission",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Name:*\n${body.name}` },
          { type: "mrkdwn", text: `*Email:*\n${body.email}` },
          ...(body.phone ? [{ type: "mrkdwn", text: `*Phone:*\n${body.phone}` }] : []),
          ...(body.company ? [{ type: "mrkdwn", text: `*Company:*\n${body.company}` }] : []),
        ],
      },
      ...(body.subject
        ? [{ type: "section", text: { type: "mrkdwn", text: `*Subject:*\n${body.subject}` } }]
        : []),
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Message:*\n${body.message}` },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Submitted at ${new Date().toLocaleString()}` }],
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit (stricter for contact form)
    const rateLimit = await checkRateLimit(request, "contact");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.reset);
    }

    // Parse and sanitize input
    const rawBody = await request.json();
    const sanitizedBody = sanitizeObject(rawBody);

    // Validate with Zod schema
    const parseResult = contactFormSchema.safeParse(sanitizedBody);

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

    // Save to database if Supabase is configured
    if (isSupabaseConfigured()) {
      const supabase = await createServerClient();

      const contactData: ContactInsert = {
        name: body.name,
        email: body.email,
        phone: body.phone || null,
        company: body.company || null,
        subject: body.subject || null,
        message: body.message,
        status: "new",
      };

      const { error: dbError } = await supabase.from("contacts").insert(contactData as never);

      if (dbError) {
        console.error("Database error:", dbError);
        // Continue with email even if DB fails
      }
    }

    // Send email via Resend
    const emailTo = process.env.EMAIL_TO || "info@newstreamlogistics.com";
    const emailFrom = process.env.EMAIL_FROM || "contact@newstreamlogistics.com";

    const emailBody = `
New Contact Form Submission

Name: ${body.name}
Email: ${body.email}
${body.phone ? `Phone: ${body.phone}` : ""}
${body.company ? `Company: ${body.company}` : ""}
${body.subject ? `Subject: ${body.subject}` : ""}

Message:
${body.message}

---
Submitted at: ${new Date().toISOString()}
    `.trim();

    const resend = getResendOptional();
    if (resend) {
      await resend.emails.send({
        from: emailFrom,
        to: emailTo,
        subject: body.subject
          ? `Contact: ${body.subject}`
          : `New Contact Form Submission from ${body.name}`,
        text: emailBody,
        replyTo: body.email,
      });
    }

    // Send Slack notification
    await sendSlackNotification(body);

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error processing contact form:", error);

    // Don't expose internal error details to client
    return NextResponse.json(
      { error: "Failed to send message. Please try again later." },
      { status: 500 }
    );
  }
}
