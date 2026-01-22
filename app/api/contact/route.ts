import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { contactFormSchema } from "@/lib/validations/contact";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
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

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not configured - emails will not be sent");
    return null;
  }
  return new Resend(apiKey);
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

    const resend = getResend();
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
