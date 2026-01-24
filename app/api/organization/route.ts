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

// GET: Get current user's organization
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

    return NextResponse.json({ organization: membership.organization });
  } catch (error) {
    console.error("Error in GET /api/organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update organization (admin only)
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
    const { name, phone, address } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;

    const { data, error } = await getSupabase()
      .from("organizations")
      .update(updateData)
      .eq("id", membership.organization.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating organization:", error);
      return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
    }

    return NextResponse.json({ success: true, organization: data });
  } catch (error) {
    console.error("Error in PATCH /api/organization:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
