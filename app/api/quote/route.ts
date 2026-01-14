import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { quoteFormSchema } from "@/lib/validations/quote";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeObject } from "@/lib/sanitize";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { QuoteInsert } from "@/types/database";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = await checkRateLimit(request, "quote");
    if (!rateLimit.success) {
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

    // Save to database if Supabase is configured
    if (isSupabaseConfigured()) {
      const supabase = createAdminClient();

      const quoteData: QuoteInsert = {
        container_number: body.containerNumber,
        pickup_terminal: body.terminal,
        delivery_zip: body.deliveryZip,
        container_type: body.containerType,
        lfd: body.lfd || null,
        special_instructions: body.notes || null,
        contact_name: body.fullName,
        company_name: body.companyName,
        email: body.email,
        phone: body.phone || null,
        status: "pending",
      };

      const { data: quote, error: dbError } = await supabase
        .from("quotes")
        .insert(quoteData as never)
        .select("reference_number")
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        // Continue with email even if DB fails
      } else if (quote) {
        referenceNumber = (quote as { reference_number: string }).reference_number || null;
      }
    }

    // Send email via Resend
    const emailTo = process.env.EMAIL_TO || "dispatcher@newstreamlogistics.com";
    const emailFrom = process.env.EMAIL_FROM || "quotes@newstreamlogistics.com";

    const emailBody = `
New Quote Request${referenceNumber ? ` - ${referenceNumber}` : ""}

CONTACT INFORMATION
-------------------
Name: ${body.fullName}
Company: ${body.companyName}
Email: ${body.email}
${body.phone ? `Phone: ${body.phone}` : ""}

SHIPMENT DETAILS
----------------
Container Number: ${body.containerNumber}
Terminal: ${body.terminal}
Delivery ZIP: ${body.deliveryZip}
Container Type: ${body.containerType}
${body.lfd ? `Last Free Day (LFD): ${body.lfd}` : ""}
${body.notes ? `\nNotes: ${body.notes}` : ""}

---
Submitted at: ${new Date().toISOString()}
    `.trim();

    const resend = getResend();
    await resend.emails.send({
      from: emailFrom,
      to: emailTo,
      replyTo: body.email,
      subject: `New Quote Request - Container ${body.containerNumber}${referenceNumber ? ` (${referenceNumber})` : ""} - ${body.companyName}`,
      text: emailBody,
    });

    return NextResponse.json({
      success: true,
      message: "Quote request submitted successfully",
      referenceNumber,
    });
  } catch (error) {
    console.error("Error processing quote request:", error);

    // Don't expose internal error details to client
    return NextResponse.json(
      { error: "Failed to process quote request. Please try again later." },
      { status: 500 }
    );
  }
}
// Build trigger 1768393569
