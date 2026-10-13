import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, type WebhookPayload } from "@/lib/portpro";
import { processPortProWebhook } from "@/lib/portpro-processing";
import { pushToDeadLetterQueue } from "@/lib/webhook-dlq";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const secret = process.env.PORTPRO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  if (!verifyWebhookSignature(request.headers.get("X-Hub-Signature"), body, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(body);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid payload");
  } catch { return NextResponse.json({ error: "Invalid payload" }, { status: 400 }); }
  try {
    const result = await processPortProWebhook(payload);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    console.error("PortPro event failed", error);
    const queued = await pushToDeadLetterQueue(payload.event_type || payload.eventType || "unknown", body, message);
    // If durable handoff fails, PortPro must retry. Never acknowledge a lost event.
    return NextResponse.json({ success: false, queued }, { status: queued ? 200 : 503 });
  }
}
export async function GET() {
  return NextResponse.json({ status: "ok", webhook: "portpro" });
}
