import { NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";

const supabase = createUntypedAdminClient();

// GET: List all organizations (super admin only)
export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run both queries in parallel
    const [orgsResult, memberCountsResult] = await Promise.all([
      supabase
        .from("organizations")
        .select(`
          id,
          name,
          slug,
          email_domain,
          primary_email,
          created_at
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("organization_members")
        .select("organization_id"),
    ]);

    const { data: orgs, error } = orgsResult;
    const { data: memberCounts } = memberCountsResult;

    if (error) {
      console.error("Error fetching organizations:", error);
      return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
    }

    // Count members per org
    const countMap = new Map<string, number>();
    if (memberCounts) {
      for (const m of memberCounts) {
        const current = countMap.get(m.organization_id) || 0;
        countMap.set(m.organization_id, current + 1);
      }
    }

    // Combine data
    const organizations = (orgs || []).map((org) => ({
      ...org,
      member_count: countMap.get(org.id) || 0,
    }));

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error("Error in GET /api/admin/organizations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
