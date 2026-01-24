/**
 * Manual Retry DLQ Item Endpoint
 * Manually retry a specific failed webhook
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { hasModuleAccess } from "@/lib/auth";
import { getDeadLetterItems, updateRetryAttempt } from "@/lib/webhook-dlq";
import { mapPortProStatus, WebhookPayload } from "@/lib/portpro";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase environment variables are not configured");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

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
    const success = await reprocessWebhook(item.eventType, payload);

    await updateRetryAttempt(id, success, success ? undefined : "Manual retry failed");

    return NextResponse.json({ success, id });
  } catch (error) {
    console.error("Failed to retry DLQ item:", error);
    return NextResponse.json({ error: "Failed to retry" }, { status: 500 });
  }
}

async function reprocessWebhook(
  eventType: string,
  payload: WebhookPayload
): Promise<boolean> {
  const supabase = getSupabase();
  const data = payload.data;
  if (!data) return false;

  const referenceNumber = payload.reference_number || data.reference_number;

  try {
    switch (eventType) {
      case "load#created": {
        const { data: existing } = await supabase
          .from("loads")
          .select("id")
          .eq("portpro_reference", referenceNumber)
          .single();

        if (existing) return true;

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

      case "load#status_updated": {
        const newStatus = data.status || data.changedValues?.status;
        if (!newStatus) return true;

        const { error } = await supabase
          .from("loads")
          .update({
            status: mapPortProStatus(newStatus),
            updated_at: new Date().toISOString(),
          })
          .eq("portpro_reference", referenceNumber);

        return !error;
      }

      case "load#info_updated":
      case "load#dates_updated": {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };

        if (data.deliveryTimes?.[0]?.deliveryFromTime) {
          updates.eta = data.deliveryTimes[0].deliveryFromTime;
        }
        if (data.pickupTimes?.[0]?.pickupFromTime) {
          updates.pickup_time = data.pickupTimes[0].pickupFromTime;
        }

        const { error } = await supabase
          .from("loads")
          .update(updates)
          .eq("portpro_reference", referenceNumber);

        return !error;
      }

      case "load#equipment_updated": {
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

      default:
        return true; // Mark as success for unhandled events
    }
  } catch (error) {
    console.error("Reprocess error:", error);
    return false;
  }
}
