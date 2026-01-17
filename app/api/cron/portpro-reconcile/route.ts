/**
 * PortPro Reconciliation Cron Job
 * Runs every 4 hours to sync all loads from PortPro
 * Catches any missed webhooks and corrects discrepancies
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getPortProClient,
  mapPortProStatus,
  formatLocation,
  extractLookupValue,
  PortProLoad,
} from "@/lib/portpro";
import { sendSlackAlert } from "@/lib/sync-monitoring";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let synced = 0;
  let updated = 0;
  let errors = 0;
  let discrepancies = 0;

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

    // Fetch all loads in batches
    const batchSize = 100;
    let skip = 0;
    let hasMore = true;
    const allLoads: PortProLoad[] = [];

    while (hasMore) {
      const loads = await portpro.getLoads({ skip, limit: batchSize });
      allLoads.push(...loads);
      hasMore = loads.length === batchSize;
      skip += batchSize;

      // Add small delay to avoid rate limiting
      if (hasMore) await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`Reconciliation: Fetched ${allLoads.length} loads from PortPro`);

    // Process each load
    for (const load of allLoads) {
      try {
        if (!load.containerNo) continue;

        // Check if load exists in our database
        const { data: existing } = await supabase
          .from("loads")
          .select("id, status, updated_at, billing_total")
          .eq("portpro_reference", load.reference_number)
          .single();

        const shipmentData = buildShipmentData(load);

        if (existing) {
          // Check for discrepancies
          const localStatus = existing.status;
          const remoteStatus = mapPortProStatus(load.status);

          if (localStatus !== remoteStatus) {
            discrepancies++;
            console.log(
              `Discrepancy: ${load.reference_number} status ${localStatus} -> ${remoteStatus}`
            );
          }

          // Update existing record
          const { error } = await supabase
            .from("loads")
            .update(shipmentData)
            .eq("id", existing.id);

          if (error) throw error;
          updated++;
        } else {
          // Create new record
          const trackingNumber = `NSL${Date.now().toString(36).toUpperCase()}${Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase()}`;

          const { error } = await supabase.from("loads").insert({
            ...shipmentData,
            tracking_number: trackingNumber,
          });

          if (error) throw error;
          synced++;
        }
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
          status: "completed",
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
      success: true,
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

function buildShipmentData(load: PortProLoad) {
  const pickupLocation =
    formatLocation(load.pickupLocation) ||
    formatLocation(load.shipper) ||
    formatLocation(load.terminal);

  const deliveryLocation =
    formatLocation(load.deliveryLocation) || formatLocation(load.consignee);

  return {
    container_number: load.containerNo,
    container_size: extractLookupValue(load.containerSize ?? null),
    container_type: extractLookupValue(load.containerType ?? null),
    status: mapPortProStatus(load.status),
    origin: pickupLocation,
    destination: deliveryLocation,
    customer_name: load.caller?.company_name || null,
    customer_email: load.caller?.email || null,
    eta: load.deliveryTimes?.[0]?.deliveryFromTime || null,
    pickup_time: load.pickupTimes?.[0]?.pickupFromTime || null,
    last_free_day: load.lastFreeDay || null,
    weight: load.weight || null,
    seal_number: load.sealNo || null,
    chassis_number: load.chassisNo || null,
    total_miles: load.totalMiles || null,
    billing_total: load.totalAmount || null,
    load_margin: calculateMargin(load),
    portpro_reference: load.reference_number,
    portpro_load_id: load._id,
    updated_at: new Date().toISOString(),
  };
}

function calculateMargin(load: PortProLoad): number | null {
  if (load.totalAmount == null) return null;

  let totalCosts = 0;

  if (load.expense?.length) {
    totalCosts += load.expense.reduce(
      (sum, e) => sum + (e.finalAmount || e.amount || 0),
      0
    );
  }

  if (load.vendorPay?.length) {
    totalCosts += load.vendorPay.reduce((sum, vp) => {
      if (vp.totalAmount != null) return sum + vp.totalAmount;
      if (vp.pricing?.length) {
        return (
          sum +
          vp.pricing.reduce((s, p) => s + (p.finalAmount || p.amount || 0), 0)
        );
      }
      return sum;
    }, 0);
  }

  if (load.driverPay?.length) {
    totalCosts += load.driverPay.reduce(
      (sum, dp) => sum + (dp.totalAmount || dp.amount || 0),
      0
    );
  }

  return load.totalAmount - totalCosts;
}
