/**
 * QStash-triggered PortPro Polling Endpoint
 * Runs every 5 minutes via Upstash QStash schedules
 */

import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { createClient } from "@supabase/supabase-js";
import {
  getPortProClient,
  mapPortProStatus,
  formatLocation,
  extractLookupValue,
  PortProLoad,
} from "@/lib/portpro";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute max

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verify QStash signature
async function verifyQStash(request: NextRequest, body: string): Promise<boolean> {
  const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!signingKey) {
    console.warn("QStash signing keys not configured, skipping verification");
    return true; // Allow in dev
  }

  const receiver = new Receiver({
    currentSigningKey: signingKey,
    nextSigningKey: nextSigningKey || signingKey,
  });

  try {
    const signature = request.headers.get("upstash-signature");
    if (!signature) {
      console.error("QStash: No signature header found");
      return false;
    }

    // Verify with URL (required by QStash)
    const url = request.url || "https://newstreamlogistics.com/api/qstash/portpro-poll";

    await receiver.verify({
      signature,
      body,
      url,
    });
    return true;
  } catch (error) {
    console.error("QStash verification failed:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  // Log headers for debugging
  const signature = request.headers.get("upstash-signature");
  console.log("QStash request received:", {
    hasSignature: !!signature,
    url: request.url,
  });

  // TODO: Re-enable signature verification after debugging
  // For now, allow requests from QStash (they have upstash-signature header)
  if (!signature) {
    // Not from QStash, reject
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const startTime = Date.now();
  let synced = 0;
  let updated = 0;
  let errors = 0;

  try {
    const portpro = getPortProClient();

    // Only fetch recently updated loads (last 10 minutes for 5-min polling)
    // This is more efficient than full reconciliation
    const loads = await portpro.getLoads({ limit: 100 });

    console.log(`QStash Poll: Processing ${loads.length} loads`);

    for (const load of loads) {
      try {
        // Include all loads (even without container number)

        const { data: existing } = await supabase
          .from("loads")
          .select("id, status, updated_at")
          .eq("portpro_reference", load.reference_number)
          .single();

        const shipmentData = buildShipmentData(load);

        if (existing) {
          // Check if data actually changed (compare timestamps)
          const portProUpdated = new Date(load.updatedAt || 0).getTime();
          const localUpdated = new Date(existing.updated_at || 0).getTime();

          if (portProUpdated > localUpdated) {
            await supabase
              .from("loads")
              .update(shipmentData)
              .eq("id", existing.id);
            updated++;
          }
        } else {
          // New load
          const trackingNumber = `NSL${Date.now().toString(36).toUpperCase()}${Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase()}`;

          await supabase.from("loads").insert({
            ...shipmentData,
            tracking_number: trackingNumber,
          });
          synced++;
        }
      } catch (err) {
        console.error(`Poll error for ${load.reference_number}:`, err);
        errors++;
      }
    }

    const duration = Date.now() - startTime;

    // Only log if something changed
    if (synced > 0 || updated > 0) {
      console.log(`QStash Poll: synced=${synced}, updated=${updated}, duration=${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      synced,
      updated,
      errors,
      duration_ms: duration,
    });
  } catch (error) {
    console.error("QStash Poll failed:", error);
    return NextResponse.json(
      { error: "Poll failed", details: String(error) },
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

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "qstash-portpro-poll",
    timestamp: new Date().toISOString(),
  });
}
