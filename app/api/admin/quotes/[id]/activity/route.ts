import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/auth";

/**
 * GET /api/admin/quotes/[id]/activity
 *
 * Get customer activity timeline for a quote
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await hasModuleAccess("quotes"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createUntypedAdminClient();

    // Verify quote exists
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id")
      .eq("id", id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Fetch activity log
    const { data: activities, error } = await supabase
      .from("quote_activity_log")
      .select("activity_type, created_at, metadata, ip_address, user_agent")
      .eq("quote_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching quote activity:", error);
      return NextResponse.json(
        { error: "Failed to fetch activity" },
        { status: 500 }
      );
    }

    // Transform to include ip_address and user_agent in metadata
    const transformedActivities = (activities || []).map((activity) => ({
      activity_type: activity.activity_type,
      created_at: activity.created_at,
      metadata: {
        ...activity.metadata,
        ip_address: activity.ip_address,
        user_agent: activity.user_agent,
      },
    }));

    return NextResponse.json({ activities: transformedActivities });
  } catch (error) {
    console.error("Error in GET /api/admin/quotes/[id]/activity:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
