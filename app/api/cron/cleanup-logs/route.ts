/**
 * Cleanup Logs Cron Job
 * Runs daily at 3 AM to clean up old webhook logs and sync status records
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { cleanupExpiredKeys } from "@/lib/webhook-dedup";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute

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

// Retention periods
const WEBHOOK_LOGS_RETENTION_DAYS = 30;
const SYNC_STATUS_RETENTION_DAYS = 90;

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

  const supabase = getSupabase();
  const results = {
    webhookLogsDeleted: 0,
    syncStatusDeleted: 0,
    dedupKeysCleanedUp: 0,
  };

  try {
    // Clean up old webhook logs (older than 30 days)
    const webhookCutoff = new Date();
    webhookCutoff.setDate(webhookCutoff.getDate() - WEBHOOK_LOGS_RETENTION_DAYS);

    const { data: deletedWebhookLogs, error: webhookError } = await supabase
      .from("portpro_webhook_logs")
      .delete()
      .lt("created_at", webhookCutoff.toISOString())
      .select("id");

    if (webhookError) {
      console.error("Failed to clean webhook logs:", webhookError);
    } else {
      results.webhookLogsDeleted = deletedWebhookLogs?.length || 0;
    }

    // Clean up old sync status records (older than 90 days)
    const syncCutoff = new Date();
    syncCutoff.setDate(syncCutoff.getDate() - SYNC_STATUS_RETENTION_DAYS);

    const { data: deletedSyncStatus, error: syncError } = await supabase
      .from("sync_status")
      .delete()
      .lt("started_at", syncCutoff.toISOString())
      .select("id");

    if (syncError) {
      console.error("Failed to clean sync status:", syncError);
    } else {
      results.syncStatusDeleted = deletedSyncStatus?.length || 0;
    }

    // Clean up dedup keys without TTL
    results.dedupKeysCleanedUp = await cleanupExpiredKeys();

    console.log("Cleanup completed:", results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Cleanup cron failed:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: String(error) },
      { status: 500 }
    );
  }
}
