import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { getUserOrgMembership } from "@/lib/auth";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: ReturnType<typeof createUntypedAdminClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createUntypedAdminClient();
  }
  return _supabase;
}

// GET: List organization members
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getUserOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { data, error } = await getSupabase()
      .from("organization_members")
      .select(`
        id,
        user_id,
        email,
        role,
        created_at,
        profiles (
          full_name
        )
      `)
      .eq("organization_id", membership.organization.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching members:", error);
      return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
    }

    // Flatten profile data
    const members = (data || []).map((member) => ({
      ...member,
      profile: Array.isArray(member.profiles)
        ? member.profiles[0]
        : member.profiles,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error in GET /api/organization/members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update member role (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getUserOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) {
      return NextResponse.json({ error: "memberId and role required" }, { status: 400 });
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Verify member belongs to user's org
    const { data: member } = await getSupabase()
      .from("organization_members")
      .select("id, organization_id, user_id, role")
      .eq("id", memberId)
      .single();

    if (!member || member.organization_id !== membership.organization.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent demoting yourself (last admin check)
    if (member.user_id === user.id && role !== "admin") {
      // Check if there are other admins
      const { data: admins } = await getSupabase()
        .from("organization_members")
        .select("id")
        .eq("organization_id", membership.organization.id)
        .eq("role", "admin");

      if (!admins || admins.length <= 1) {
        return NextResponse.json(
          { error: "Cannot demote: you are the only admin" },
          { status: 400 }
        );
      }
    }

    // Update role
    const { error: updateError } = await getSupabase()
      .from("organization_members")
      .update({ role })
      .eq("id", memberId);

    if (updateError) {
      console.error("Error updating member role:", updateError);
      return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/organization/members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove member (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getUserOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("id");

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    // Verify member belongs to user's org
    const { data: member } = await getSupabase()
      .from("organization_members")
      .select("id, organization_id, user_id")
      .eq("id", memberId)
      .single();

    if (!member || member.organization_id !== membership.organization.id) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent removing yourself
    if (member.user_id === user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    // Delete member
    const { error: deleteError } = await getSupabase()
      .from("organization_members")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      console.error("Error removing member:", deleteError);
      return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/organization/members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
