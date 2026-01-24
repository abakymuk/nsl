import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isSuperAdmin, grantSuperAdmin, revokeSuperAdmin } from "@/lib/auth";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: ReturnType<typeof createUntypedAdminClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createUntypedAdminClient();
  }
  return _supabase;
}

// Lazy auth admin client initialization
let _authAdmin: SupabaseClient | null = null;
function getAuthAdmin(): SupabaseClient {
  if (!_authAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase environment variables are not configured");
    }
    _authAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return _authAdmin;
}

// GET: List all users (super admin only)
export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all profiles with org membership
    const { data: profiles, error } = await getSupabase()
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

    // Get auth users to fetch last_sign_in_at
    const { data: authData } = await getAuthAdmin().auth.admin.listUsers({
      perPage: 1000, // Adjust as needed
    });

    // Create map of auth user data by ID
    const authUserMap = new Map<string, { last_sign_in_at: string | null; email_confirmed_at: string | null }>();
    if (authData?.users) {
      for (const user of authData.users) {
        authUserMap.set(user.id, {
          last_sign_in_at: user.last_sign_in_at || null,
          email_confirmed_at: user.email_confirmed_at || null,
        });
      }
    }

    // Get org memberships for all users
    const { data: memberships } = await getSupabase()
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

    // Get employee status for all users
    const { data: employees } = await getSupabase()
      .from("employees")
      .select("user_id, permissions, is_active");

    const employeeMap = new Map<string, { permissions: string[]; is_active: boolean }>();
    if (employees) {
      for (const emp of employees) {
        employeeMap.set(emp.user_id, { permissions: emp.permissions, is_active: emp.is_active });
      }
    }

    // Combine data
    const users = (profiles || []).map((profile) => {
      const membership = membershipMap.get(profile.id);
      const authUser = authUserMap.get(profile.id);
      const employee = employeeMap.get(profile.id);

      return {
        ...profile,
        organization: membership?.org || null,
        org_role: membership?.role || null,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        email_confirmed_at: authUser?.email_confirmed_at || null,
        is_platform_employee: !!employee?.is_active,
        employee_permissions: employee?.is_active ? employee.permissions : null,
      };
    });

    // Calculate stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: users.length,
      superAdmins: users.filter(u => u.role === "super_admin").length,
      platformEmployees: users.filter(u => u.is_platform_employee).length,
      withOrganizations: users.filter(u => u.organization).length,
      activeLastWeek: users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo).length,
      activeLastMonth: users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) > thirtyDaysAgo).length,
      neverLoggedIn: users.filter(u => !u.last_sign_in_at).length,
    };

    return NextResponse.json({ users, stats });
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
