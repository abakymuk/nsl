import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { quoteFormSchema, calculateLeadScore, isUrgentLead } from "@/lib/validations/quote";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { getUserOrgMembership } from "@/lib/auth";
import { getOrCreateStatusToken, buildStatusUrl } from "@/lib/quotes/tokens";
import { deliverQuoteNotifications } from "@/lib/quotes/outbox";
import { sanitizeObject } from "@/lib/sanitize";

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, "quote");
  if (!rateLimit.success) return rateLimitResponse(rateLimit.reset);
  try {
    const input = await request.json().catch(() => null);
    const parsed = quoteFormSchema.safeParse(input && typeof input === "object" ? sanitizeObject(input) : input);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", errors: parsed.error.issues }, { status: 400 });
    const body = parsed.data;
    const key = request.headers.get("idempotency-key") || randomUUID();
    if (!z.uuid().safeParse(key).success) return NextResponse.json({ error: "Invalid submission key" }, { status: 400 });
    const user = await getUser();
    const membership = user?.email_confirmed_at ? await getUserOrgMembership(user.id) : null;
    const organizationId = membership?.organization.id || null;
    // Public form fields never establish organization membership or ownership.
    const hash = createHash("sha256").update(JSON.stringify({ body, organizationId })).digest("hex");
    const db = createUntypedAdminClient();
    const { data: existingQuote, error } = await db.from("quotes").select("id, reference_number, submission_hash")
      .eq("submission_key", key).maybeSingle();
    if (error) throw error;
    let quote = existingQuote;
    const leadScore = calculateLeadScore(body);
    const isUrgent = isUrgentLead(leadScore, body);
    if (!quote) {
      const result = await db.from("quotes").insert({
        submission_key: key, submission_hash: hash, organization_id: organizationId,
        contact_name: body.fullName, company_name: body.companyName,
        email: body.email || null, phone: body.phone,
        container_number: body.containerNumber || null, container_type: body.containerType || "40ft",
        pickup_terminal: body.terminal || null, delivery_zip: body.deliveryZip,
        delivery_type: body.deliveryType || null, appointment_required: body.appointmentRequired,
        service_type: body.moveType || "import", lfd: body.lfd || null,
        availability_date: body.availabilityDate || null,
        special_instructions: [body.notes, body.commodityType ? `Commodity: ${body.commodityType}` : null].filter(Boolean).join("\n") || null,
        port: body.port, request_type: body.requestType, time_sensitive: body.timeSensitive,
        lead_score: leadScore, is_urgent: isUrgent, status: "pending", lifecycle_status: "pending",
      }).select("id, reference_number, submission_hash").single();
      quote = result.data;
      if (result.error?.code === "23505") {
        // The competing request must have committed the same key, not merely
        // collided on another unique field such as the reference number.
        const existing = await db.from("quotes").select("id, reference_number, submission_hash").eq("submission_key", key).single();
        if (existing.error) throw existing.error;
        quote = existing.data;
      } else if (result.error) throw result.error;
    }
    if (!quote) throw new Error("Quote was not saved");
    if (quote.submission_hash !== hash) return NextResponse.json({ error: "Submission key already used for different details" }, { status: 409 });
    // Notifications are enqueued by the insert transaction. Immediate delivery
    // is best effort; the cron retries persisted jobs if a provider is unavailable.
    try { await deliverQuoteNotifications(quote.id); } catch (error) { console.error("Notification delivery deferred", error); }
    let statusUrl: string | null = null;
    try {
      const token = await getOrCreateStatusToken(quote.id);
      if (token) statusUrl = buildStatusUrl(token);
    } catch (error) { console.error("Status link deferred", error); }
    return NextResponse.json({ success: true, referenceNumber: quote.reference_number, statusUrl, leadScore, isUrgent });
  } catch (error) {
    console.error("Quote submission failed", error);
    return NextResponse.json({ error: "Unable to save your request. Please try again." }, { status: 503 });
  }
}
