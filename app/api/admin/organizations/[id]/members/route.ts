import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";

const supabase = createUntypedAdminClient();

// GET: Get organization members (super admin only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        id,
        email,
        role,
        profiles (
          full_name
        )
      `)
      .eq("organization_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    // Flatten profile data
    const members = (data || []).map((member) => ({
      ...member,
      profile: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error in GET /api/admin/organizations/[id]/members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
