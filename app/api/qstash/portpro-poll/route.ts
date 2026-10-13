/**
 * QStash-triggered PortPro Polling Endpoint
 * Runs every 5 minutes via Upstash QStash schedules
 */

import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getPortProClient } from "@/lib/portpro";
import { syncPortProLoad } from "@/lib/portpro-processing";

export const runtime = "nodejs";
export const maxDuration = 60; // 1 minute max

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

// Verify QStash signature
async function verifyQStash(request: NextRequest, body: string): Promise<boolean> {
  const signingKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!signingKey) {
    if (process.env.NODE_ENV === "production") {
      console.error("QStash signing keys not configured in production — rejecting request");
      return false;
    }
    console.warn("QStash signing keys not configured, skipping verification in dev");
    return true;
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

  // Verify QStash signature (fail-closed)
  const isValid = await verifyQStash(request, body);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = getSupabase();
  const startTime = Date.now();
  const synced = 0;
  let updated = 0;
  let errors = 0;

  try {
    const portpro = getPortProClient();

    const { data: cursor, error: cursorError } = await supabase.from("sync_cursors")
      .select("offset_value").eq("name", "portpro").single();
    if (cursorError) throw cursorError;
    const offset = cursor.offset_value;
    const loads = await portpro.getLoads({ skip: offset, limit: 50 });
    for (const load of loads) {
      try {
        const result = await syncPortProLoad(load);
        if (!result.duplicate) updated++;
      } catch (error) {
        console.error("PortPro snapshot failed", error);
        errors++;
      }
    }
    // Retry the page on any error. Advance only once; concurrent polls cannot
    // overwrite a newer cursor. An empty page starts a new full sweep.
    if (errors === 0) {
      const { error } = await supabase.from("sync_cursors")
        .update({ offset_value: loads.length ? offset + loads.length : 0 })
        .eq("name", "portpro").eq("offset_value", offset);
      if (error) throw error;
    }
    const duration = Date.now() - startTime;

    // Only log if something changed
    if (synced > 0 || updated > 0) {
      console.log(`QStash Poll: synced=${synced}, updated=${updated}, duration=${duration}ms`);
    }

    return NextResponse.json({
      success: errors === 0,
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

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "qstash-portpro-poll",
    timestamp: new Date().toISOString(),
  });
}
