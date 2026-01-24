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
    // Verify cron secret
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createUntypedAdminClient();
    const now = new Date().toISOString();

    // Find quotes that are:
    // 1. In "quoted" status (waiting for customer response)
    // 2. Have an expiration date that has passed
    const { data: expiredQuotes, error: fetchError } = await supabase
      .from("quotes")
      .select("id, reference_number, email, contact_name, expires_at")
      .eq("lifecycle_status", "quoted")
      .lt("expires_at", now);

    if (fetchError) {
      console.error("Error fetching expired quotes:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch expired quotes" },
        { status: 500 }
      );
    }

    if (!expiredQuotes || expiredQuotes.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired quotes found",
        processed: 0,
      });
    }

    console.log(`Found ${expiredQuotes.length} expired quotes to process`);

    // Update all expired quotes
    const quoteIds = expiredQuotes.map((q) => q.id);

    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        lifecycle_status: "expired",
        status: "expired",
        updated_at: now,
      })
      .in("id", quoteIds);

    if (updateError) {
      console.error("Error updating expired quotes:", updateError);
      return NextResponse.json(
        { error: "Failed to update expired quotes" },
        { status: 500 }
      );
    }

    // Create audit log entries for each expired quote
    const auditEntries = expiredQuotes.map((quote) => ({
      quote_id: quote.id,
      action: "expired",
      old_status: "quoted",
      new_status: "expired",
      actor_type: "system",
      metadata: {
        expired_at: quote.expires_at,
        processed_at: now,
      },
    }));

    await supabase.from("quote_audit_log").insert(auditEntries);

    // TODO: Send expiration notification emails to customers (optional)
    // Could be added in a future iteration

    console.log(`Successfully expired ${quoteIds.length} quotes`);

    return NextResponse.json({
      success: true,
      message: `Expired ${quoteIds.length} quotes`,
      processed: quoteIds.length,
      quoteIds,
    });
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
