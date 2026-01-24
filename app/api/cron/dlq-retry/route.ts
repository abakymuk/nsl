/**
 * Dead Letter Queue Retry Cron Job
 * Runs every 15 minutes to retry failed webhooks
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getItemsReadyForRetry,
  updateRetryAttempt,
  getDeadLetterStats,
  isDLQOverThreshold,
} from "@/lib/webhook-dlq";
import { mapPortProStatus, WebhookPayload } from "@/lib/portpro";
import { sendSlackAlert } from "@/lib/sync-monitoring";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
        const success = await reprocessWebhook(item.eventType, payload);

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

/**
 * Reprocess a webhook event (simplified version of main webhook handler)
 */
async function reprocessWebhook(
  eventType: string,
  payload: WebhookPayload
): Promise<boolean> {
  const data = payload.data;
  if (!data) return false;

  const referenceNumber = payload.reference_number || data.reference_number;

  switch (eventType) {
    case "load#created":
      return await handleLoadCreated(data, referenceNumber);

    case "load#status_updated":
      return await handleLoadStatusUpdated(data, referenceNumber);

    case "load#info_updated":
    case "load#dates_updated":
      return await handleLoadInfoUpdated(data, referenceNumber);

    case "load#equipment_updated":
      return await handleEquipmentUpdated(data, referenceNumber);

    default:
      console.log(`DLQ Retry: Skipping unhandled event type ${eventType}`);
      return true; // Mark as success to remove from queue
  }
}

async function handleLoadCreated(
  data: Record<string, any>,
  referenceNumber: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from("loads")
    .select("id")
    .eq("portpro_reference", referenceNumber)
    .single();

  if (existing) return true; // Already exists

  const trackingNumber = `NSL${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;

  const { error } = await supabase.from("loads").insert({
    tracking_number: trackingNumber,
    portpro_reference: referenceNumber,
    portpro_load_id: data._id,
    container_number: data.containerNo || "PENDING",
    status: mapPortProStatus(data.status || "PENDING"),
    customer_name: data.caller?.company_name,
    customer_email: data.caller?.email,
  });

  return !error;
}

async function handleLoadStatusUpdated(
  data: Record<string, any>,
  referenceNumber: string
): Promise<boolean> {
  const newStatus = data.status || data.changedValues?.status;
  if (!newStatus) return true;

  const mappedStatus = mapPortProStatus(newStatus);

  const { error } = await supabase
    .from("loads")
    .update({
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("portpro_reference", referenceNumber);

  return !error;
}

async function handleLoadInfoUpdated(
  data: Record<string, any>,
  referenceNumber: string
): Promise<boolean> {
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (data.deliveryTimes?.[0]?.deliveryFromTime) {
    updates.eta = data.deliveryTimes[0].deliveryFromTime;
  }
  if (data.pickupTimes?.[0]?.pickupFromTime) {
    updates.pickup_time = data.pickupTimes[0].pickupFromTime;
  }
  if (data.containerSize) {
    updates.container_size = data.containerSize;
  }

  const { error } = await supabase
    .from("loads")
    .update(updates)
    .eq("portpro_reference", referenceNumber);

  return !error;
}

async function handleEquipmentUpdated(
  data: Record<string, any>,
  referenceNumber: string
): Promise<boolean> {
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (data.containerNo) updates.container_number = data.containerNo;
  if (data.chassisNo) updates.chassis_number = data.chassisNo;
  if (data.sealNo) updates.seal_number = data.sealNo;

  const { error } = await supabase
    .from("loads")
    .update(updates)
    .eq("portpro_reference", referenceNumber);

  return !error;
}
