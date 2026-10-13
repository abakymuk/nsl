/**
 * PortPro Reconciliation Cron Job
 * Runs every 4 hours to sync all loads from PortPro
 * Catches any missed webhooks and corrects discrepancies
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  getPortProClient,
  PortProLoad,
} from "@/lib/portpro";
import { syncPortProLoad } from "@/lib/portpro-processing";
import { sendSlackAlert } from "@/lib/sync-monitoring";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

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

  const startTime = Date.now();
  const synced = 0;
  let updated = 0;
  let errors = 0;
  const discrepancies = 0;

  try {
    // Log sync start
    const { data: syncLog } = await supabase
      .from("sync_status")
      .insert({
        sync_type: "reconcile",
        status: "running",
        metadata: { triggered_by: "cron" },
      })
      .select("id")
      .single();

    const syncId = syncLog?.id;

    // Get PortPro client
    const portpro = getPortProClient();

    // Fetch all loads in batches (PortPro may have its own limit per request)
    const batchSize = 50; // PortPro default limit
    let skip = 0;
    let hasMore = true;
    const allLoads: PortProLoad[] = [];

    while (hasMore) {
      const loads = await portpro.getLoads({ skip, limit: batchSize });
      allLoads.push(...loads);

      // Continue until we get 0 results (handles any API limit)
      hasMore = loads.length > 0;
      skip += loads.length;

      // Add small delay to avoid rate limiting
      if (hasMore) await new Promise((r) => setTimeout(r, 500));

      // Safety limit to prevent infinite loops
      if (skip > 10000) throw new Error("Reconciliation limit exceeded; use cursor polling");
    }

    console.log(`Reconciliation: Fetched ${allLoads.length} loads from PortPro`);

    // Process each load
    for (const load of allLoads) {
      try {
        const result = await syncPortProLoad(load);
        if (!result.duplicate) updated++;
      } catch (loadError) {
        console.error(`Error processing ${load.reference_number}:`, loadError);
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    // Update sync log
    if (syncId) {
      await supabase
        .from("sync_status")
        .update({
          status: errors ? "failed" : "completed",
          completed_at: new Date().toISOString(),
          records_processed: allLoads.length,
          records_failed: errors,
          metadata: {
            triggered_by: "cron",
            synced,
            updated,
            discrepancies,
            duration_ms: duration,
          },
        })
        .eq("id", syncId);
    }

    // Alert if too many discrepancies
    if (discrepancies > 20) {
      await sendSlackAlert("reconciliation_drift", {
        discrepancies,
        total: allLoads.length,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: errors === 0,
      total: allLoads.length,
      synced,
      updated,
      discrepancies,
      errors,
      duration_ms: duration,
    });
  } catch (error) {
    console.error("Reconciliation failed:", error);

    await sendSlackAlert("reconciliation_drift", {
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "Reconciliation failed", details: String(error) },
      { status: 500 }
    );
  }
}
