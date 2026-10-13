import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

/**
 * POST /api/cron/quote-expiration
 *
 * Cron job to expire quotes past their expiration date.
 * Should be called periodically (e.g., every hour via Vercel Cron or QStash).
 *
 * Authorization: Bearer token from CRON_SECRET env var
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (fail closed)
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET not configured — rejecting cron request");
      return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createUntypedAdminClient();
    const now = new Date().toISOString();

    // Re-check status and expiry in the UPDATE itself. The lifecycle trigger
    // writes the audit record in the same transaction.
    const { data, error } = await supabase.from("quotes")
      .update({ lifecycle_status: "expired", updated_at: now })
      .eq("lifecycle_status", "quoted").lt("expires_at", now).select("id");
    if (error) throw error;
    return NextResponse.json({ success: true, processed: data?.length || 0 });
  } catch (error) {
    console.error("Error in quote expiration cron:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Also support GET for easier manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
