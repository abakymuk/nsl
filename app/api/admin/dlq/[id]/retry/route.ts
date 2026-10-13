/**
 * Manual Retry DLQ Item Endpoint
 * Manually retry a specific failed webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { hasModuleAccess } from "@/lib/auth";
import { getDeadLetterItems, updateRetryAttempt } from "@/lib/webhook-dlq";
import { type WebhookPayload } from "@/lib/portpro";
import { processPortProWebhook } from "@/lib/portpro-processing";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasModuleAccess("sync"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Find the item
    const items = await getDeadLetterItems();
    const item = items.find((i) => i.id === id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Try to reprocess
    const payload: WebhookPayload = JSON.parse(item.payload);
    await processPortProWebhook({ ...payload, event_type: item.eventType });
    const success = true;

    await updateRetryAttempt(id, success, success ? undefined : "Manual retry failed");

    return NextResponse.json({ success, id });
  } catch (error) {
    console.error("Failed to retry DLQ item:", error);
    return NextResponse.json({ error: "Failed to retry" }, { status: 500 });
  }
}
