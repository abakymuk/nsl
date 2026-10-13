import { createUntypedAdminClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { notify } from "@/lib/notifications";

export async function deliverQuoteNotifications(quoteId?: string) {
  const db = createUntypedAdminClient();
  const { data: jobs, error } = await db.rpc("claim_quote_notifications", { p_quote_id: quoteId || null });
  if (error) throw error;
  let failed = 0;
  for (const job of jobs || []) {
    try {
      const { data: quote, error: quoteError } = await db.from("quotes").select("*").eq("id", job.quote_id).single();
      if (quoteError) throw quoteError;
      if (job.channel === "email") {
        const { error: emailError } = await getResend().emails.send({
          from: process.env.EMAIL_FROM || "quotes@newstreamlogistics.com",
          to: process.env.EMAIL_TO || "vlad@newstreamlogistics.com",
          replyTo: quote.email || undefined,
          subject: `${quote.is_urgent ? "[URGENT] " : ""}Quote Request - ${quote.reference_number} - ${quote.company_name}`,
          text: [
            `Reference: ${quote.reference_number}`, `Company: ${quote.company_name}`,
            `Contact: ${quote.contact_name}`, `Phone: ${quote.phone}`, `Email: ${quote.email || "Not provided"}`,
            `Port: ${quote.port}`, `Request: ${quote.request_type}`, `Lead score: ${quote.lead_score}`,
            `Container: ${quote.container_number || "TBD"}`, `Terminal: ${quote.pickup_terminal || "TBD"}`,
            `Delivery ZIP: ${quote.delivery_zip}`, `Last free day: ${quote.lfd || "TBD"}`,
            quote.special_instructions || "",
          ].join("\n"),
        }, { idempotencyKey: job.id });
        if (emailError) throw new Error(emailError.message);
      } else if (job.channel === "slack" && process.env.SLACK_WEBHOOK_URL) {
        const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `New quote ${quote.reference_number}: ${quote.company_name}; ${quote.phone}; ZIP ${quote.delivery_zip}` }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Slack returned ${response.status}`);
      } else if (job.channel === "in_app") {
        const result = await notify("quote_submitted", quote.id, { reference: quote.reference_number,
          contact_name: quote.contact_name, company_name: quote.company_name,
          is_urgent: quote.is_urgent, lead_score: quote.lead_score });
        if (result.errors?.length) throw new Error(result.errors.join("; "));
        if (Object.values(result.channels).some((channel) => channel.failed > 0)) {
          throw new Error("An employee notification channel failed");
        }
      }
      const { error: updateError } = await db.from("notification_outbox")
        .update({ delivered_at: new Date().toISOString(), last_error: null }).eq("id", job.id);
      if (updateError) throw updateError;
    } catch (error) {
      failed++;
      await db.from("notification_outbox").update({
        last_error: error instanceof Error ? error.message : "Delivery failed",
        available_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6)) * 1000).toISOString(),
      }).eq("id", job.id);
    }
  }
  return { processed: jobs?.length || 0, failed };
}
