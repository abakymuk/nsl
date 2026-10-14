import { createUntypedAdminClient } from "@/lib/supabase/server";
import { REQUEST_TYPES, PORTS, DELIVERY_TYPES } from "@/lib/validations/quote";

interface SlackQuote {
  reference_number: string;
  contact_name: string;
  company_name: string;
  email: string | null;
  phone: string;
  port: string;
  request_type: string;
  time_sensitive: boolean;
  container_number: string | null;
  container_type: string | null;
  pickup_terminal: string | null;
  delivery_zip: string;
  delivery_type: string | null;
  appointment_required: boolean;
  service_type: string;
  lfd: string | null;
  availability_date: string | null;
  special_instructions: string | null;
  created_at: string;
}

export function buildSlackMessage(quote: SlackQuote) {
  const text = [
    `New quote request — ${quote.reference_number}`,
    `Name: ${quote.contact_name}`, `Company: ${quote.company_name}`,
    `Phone: ${quote.phone}`, `Email: ${quote.email || "Not provided"}`,
    `Port: ${PORTS.find(p => p.value === quote.port)?.label || quote.port}`,
    `Request: ${REQUEST_TYPES.find(r => r.value === quote.request_type)?.label || quote.request_type}`,
    `Time-sensitive: ${quote.time_sensitive ? "Yes" : "No"}`,
    `Move: ${quote.service_type}`, `Container: ${quote.container_number || "Not provided"}`,
    `Container type: ${quote.container_type || "Not provided"}`, `Terminal: ${quote.pickup_terminal || "Not provided"}`,
    `Last free day: ${quote.lfd || "Not provided"}`, `Available: ${quote.availability_date || "Not provided"}`,
    `Delivery ZIP: ${quote.delivery_zip}`,
    `Delivery type: ${DELIVERY_TYPES.find(d => d.value === quote.delivery_type)?.label || "Not provided"}`,
    `Appointment required: ${quote.appointment_required ? "Yes" : "No"}`,
    `Notes: ${quote.special_instructions || "None"}`, `Submitted: ${quote.created_at}`,
  ].join("\n");
  // Plain text prevents customer input from creating Slack mentions or links.
  return { text, mrkdwn: false, unfurl_links: false, unfurl_media: false,
    blocks: [{ type: "section", text: { type: "plain_text", text: text.slice(0, 3000), emoji: false } }] };
}

export async function deliverQuoteNotifications(quoteId?: string) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) throw new Error("Slack delivery is not configured");
  const db = createUntypedAdminClient();
  const { data: jobs, error } = await db.rpc("claim_quote_notifications", { p_quote_id: quoteId || null });
  if (error) throw error;
  let failed = 0;
  for (const job of jobs || []) {
    try {
      // The DB claim only returns Slack jobs. Never mark legacy email jobs sent.
      if (job.channel !== "slack") throw new Error("Unexpected notification channel");
      const { data: quote, error: quoteError } = await db.from("quotes").select("*").eq("id", job.quote_id).single();
      if (quoteError || !quote) throw new Error("Unable to read saved quote");
      const response = await fetch(webhook, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSlackMessage(quote)), signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`Slack returned ${response.status}`);
      const { error: updateError } = await db.from("notification_outbox")
        .update({ delivered_at: new Date().toISOString(), last_error: null }).eq("id", job.id);
      if (updateError) throw new Error("Unable to acknowledge Slack delivery");
    } catch (error) {
      failed++;
      // Do not log webhook URLs, customer details, or raw provider responses.
      const message = error instanceof Error && !error.message.includes("https:") ? error.message : "Slack delivery failed";
      const { error: retryError } = await db.from("notification_outbox").update({
        last_error: message,
        available_at: new Date(Date.now() + Math.min(3600, 60 * 2 ** Math.min(job.attempts, 6)) * 1000).toISOString(),
      }).eq("id", job.id);
      if (retryError) throw new Error("Unable to schedule Slack retry");
    }
  }
  if (failed) console.error("Slack delivery pending", { failed });
  return { processed: jobs?.length || 0, failed };
}
