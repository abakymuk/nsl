import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { isSuperAdmin, grantSuperAdmin, revokeSuperAdmin } from "@/lib/auth";

const supabase = createUntypedAdminClient();

// GET: List all users (super admin only)
export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all profiles with org membership
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        full_name,
        role,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Get org memberships for all users
    const { data: memberships } = await supabase
      .from("organization_members")
      .select(`
        user_id,
        role,
        organizations (
          id,
          name
        )
      `);

    // Map memberships by user_id
    const membershipMap = new Map<string, { org: { id: string; name: string }; role: string }>();
    if (memberships) {
      for (const m of memberships) {
        if (m.user_id) {
          const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
          if (org) {
            membershipMap.set(m.user_id, { org, role: m.role });
          }
        }
      }
    }

    // Combine data
    const users = (profiles || []).map((profile) => {
      const membership = membershipMap.get(profile.id);
      return {
        ...profile,
        organization: membership?.org || null,
        org_role: membership?.role || null,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error in GET /api/admin/users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Grant/revoke super admin (super admin only)
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: "userId and action required" }, { status: 400 });
    }

    if (!["grant", "revoke"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    let success: boolean;
    if (action === "grant") {
      success = await grantSuperAdmin(userId);
    } else {
      success = await revokeSuperAdmin(userId);
    }

    if (!success) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/admin/users:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
