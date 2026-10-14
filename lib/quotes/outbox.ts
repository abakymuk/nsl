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

type SlackText = { type: "text"; text: string; style?: { bold: boolean } };
type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string; emoji: boolean } }
  | { type: "context"; elements: { type: "plain_text"; text: string }[] }
  | { type: "divider" }
  | { type: "rich_text"; elements: { type: "rich_text_section"; elements: SlackText[] }[] };

// Structured text keeps customer-supplied Slack syntax literal, including mentions.
function detailBlock(rows: [string, string | null | undefined][]): SlackBlock {
  const elements: SlackText[] = [];
  for (const [label, value] of rows) {
    if (!value?.trim()) continue;
    if (elements.length) elements.push({ type: "text", text: "\n" });
    elements.push({ type: "text", text: `${label}  `, style: { bold: true } });
    elements.push({ type: "text", text: value });
  }
  return { type: "rich_text", elements: [{ type: "rich_text_section", elements }] };
}

export function buildSlackMessage(quote: SlackQuote) {
  const port = PORTS.find(p => p.value === quote.port)?.label || quote.port;
  const request = REQUEST_TYPES.find(r => r.value === quote.request_type)?.label || quote.request_type;
  const delivery = DELIVERY_TYPES.find(d => d.value === quote.delivery_type)?.label;
  const urgent = quote.time_sensitive || ["urgent_lfd", "rolled", "hold_released"].includes(quote.request_type);
  const title = urgent ? "🔴 Priority quote request" : "New quote request";
  const created = new Date(quote.created_at);
  const submitted = Number.isNaN(created.getTime()) ? null : new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(created);
  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: title, emoji: true } },
    { type: "context", elements: [{ type: "plain_text", text: [quote.reference_number, submitted].filter(Boolean).join("  ·  ") }] },
    detailBlock([
      ["Contact", quote.contact_name], ["Company", quote.company_name],
      ["Phone", quote.phone], ["Email", quote.email],
    ]),
    { type: "divider" },
    detailBlock([
      ["Route", `${port} → ${quote.delivery_zip}`],
      ["Service", `${request} · ${quote.service_type === "export" ? "Export" : "Import"}`],
      ["Delivery", delivery],
      ["Time-sensitive", quote.time_sensitive ? "Yes — penalties may apply" : null],
      ["Appointment", quote.appointment_required ? "Required at delivery" : null],
    ]),
  ];
  const containerRows: [string, string | null][] = [
    ["Container", quote.container_number], ["Equipment", quote.container_type],
    ["Terminal", quote.pickup_terminal], ["Last free day", quote.lfd], ["Available", quote.availability_date],
  ];
  if (containerRows.some(([, value]) => value?.trim())) blocks.push(detailBlock(containerRows));
  if (quote.special_instructions?.trim()) {
    blocks.push({ type: "divider" }, detailBlock([["Notes", quote.special_instructions]]));
  }
  // Short notification preview; full details live in blocks, not a wall of fallback text.
  const text = `${title} — ${quote.reference_number} | ${quote.company_name} · ${quote.contact_name} | ${port} → ${quote.delivery_zip} | ${quote.phone}`;
  return { text, mrkdwn: false, unfurl_links: false, unfurl_media: false, blocks };
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
