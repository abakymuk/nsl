/**
 * Dead Letter Queue Retry Cron Job
 * Runs every 15 minutes to retry failed webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getItemsReadyForRetry,
  updateRetryAttempt,
  getDeadLetterStats,
  isDLQOverThreshold,
} from "@/lib/webhook-dlq";
import { type WebhookPayload } from "@/lib/portpro";
import { processPortProWebhook } from "@/lib/portpro-processing";
import { sendSlackAlert } from "@/lib/sync-monitoring";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute

export async function GET(request: NextRequest) {
  // Verify cron secret (fail closed)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET not configured — rejecting cron request");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let retried = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // Check DLQ threshold and alert if needed
    if (await isDLQOverThreshold(50)) {
      const stats = await getDeadLetterStats();
      await sendSlackAlert("dlq_overflow", {
        count: stats.count,
        byEventType: stats.byEventType,
        maxRetriesReached: stats.maxRetriesReached,
        timestamp: new Date().toISOString(),
      });
    }

    // Get items ready for retry
    const items = await getItemsReadyForRetry();
    console.log(`DLQ Retry: ${items.length} items ready for retry`);

    for (const item of items) {
      retried++;

      try {
        // Parse the original payload
        const payload: WebhookPayload = JSON.parse(item.payload);

        // Reprocess based on event type
        await processPortProWebhook({ ...payload, event_type: item.eventType });
    const success = true;

        if (success) {
          await updateRetryAttempt(item.id, true);
          succeeded++;
          console.log(`DLQ Retry: ${item.id} succeeded`);
        } else {
          await updateRetryAttempt(item.id, false, "Reprocessing returned false");
          failed++;
        }
      } catch (retryError) {
        const errorMsg = retryError instanceof Error ? retryError.message : "Unknown error";
        await updateRetryAttempt(item.id, false, errorMsg);
        failed++;
        console.error(`DLQ Retry: ${item.id} failed:`, errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      retried,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error("DLQ Retry cron failed:", error);
    return NextResponse.json(
      { error: "DLQ retry failed", details: String(error) },
      { status: 500 }
    );
  }
}
