import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { isSuperAdmin, EMPLOYEE_MODULES, type EmployeeModule } from "@/lib/auth";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: ReturnType<typeof createUntypedAdminClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createUntypedAdminClient();
  }
  return _supabase;
}

// GET: List all employees (super admin only)
export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all employees with their profile info
    const { data: employees, error } = await getSupabase()
      .from("employees")
      .select(
        `
        id,
        user_id,
        permissions,
        is_active,
        created_at,
        updated_at,
        created_by,
        profiles!employees_user_id_fkey (
          id,
          email,
          full_name
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching employees:", error);
      return NextResponse.json(
        { error: "Failed to fetch employees" },
        { status: 500 }
      );
    }

    // Get creator info
    const creatorIds = [
      ...new Set(
        (employees || [])
          .map((e) => e.created_by)
          .filter((id): id is string => !!id)
      ),
    ];

    let creatorMap = new Map<string, { email: string; full_name: string }>();
    if (creatorIds.length > 0) {
      const { data: creators } = await getSupabase()
        .from("profiles")
        .select("id, email, full_name")
        .in("id", creatorIds);

      if (creators) {
        creatorMap = new Map(creators.map((c) => [c.id, c]));
      }
    }

    // Format response
    const formattedEmployees = (employees || []).map((emp) => {
      const profile = Array.isArray(emp.profiles)
        ? emp.profiles[0]
        : emp.profiles;
      const creator = emp.created_by ? creatorMap.get(emp.created_by) : null;

      return {
        id: emp.id,
        user_id: emp.user_id,
        email: profile?.email || null,
        full_name: profile?.full_name || null,
        permissions: emp.permissions || [],
        is_active: emp.is_active,
        created_at: emp.created_at,
        updated_at: emp.updated_at,
        created_by: creator
          ? { email: creator.email, full_name: creator.full_name }
          : null,
      };
    });

    return NextResponse.json({ employees: formattedEmployees });
  } catch (error) {
    console.error("Error in GET /api/admin/employees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Create new employee (super admin only)
export async function POST(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, permissions } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Validate permissions array
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "permissions must be an array" },
        { status: 400 }
      );
    }

    // Filter to only valid employee modules
    const validPermissions = permissions.filter((p): p is EmployeeModule =>
      EMPLOYEE_MODULES.includes(p as EmployeeModule)
    );

    // Check if user exists
    const { data: profile, error: profileError } = await getSupabase()
      .from("profiles")
      .select("id, email, role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Don't allow creating employee for super admin
    if (profile.role === "super_admin") {
      return NextResponse.json(
        { error: "Cannot create employee record for super admin" },
        { status: 400 }
      );
    }

    // Check if employee already exists
    const { data: existing } = await getSupabase()
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Employee already exists for this user" },
        { status: 409 }
      );
    }

    // Create employee
    const { data: employee, error: createError } = await getSupabase()
      .from("employees")
      .insert({
        user_id: userId,
        permissions: validPermissions,
        is_active: true,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating employee:", createError);
      return NextResponse.json(
        { error: "Failed to create employee" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        employee: {
          ...employee,
          email: profile.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/admin/employees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH: Update employee (super admin only)
export async function PATCH(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { employeeId, permissions, isActive } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: {
      permissions?: string[];
      is_active?: boolean;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return NextResponse.json(
          { error: "permissions must be an array" },
          { status: 400 }
        );
      }
      // Filter to only valid employee modules
      updateData.permissions = permissions.filter((p): p is EmployeeModule =>
        EMPLOYEE_MODULES.includes(p as EmployeeModule)
      );
    }

    if (isActive !== undefined) {
      updateData.is_active = Boolean(isActive);
    }

    const { data: employee, error: updateError } = await getSupabase()
      .from("employees")
      .update(updateData)
      .eq("id", employeeId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating employee:", updateError);
      return NextResponse.json(
        { error: "Failed to update employee" },
        { status: 500 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, employee });
  } catch (error) {
    console.error("Error in PATCH /api/admin/employees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Remove employee (super admin only)
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("id");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await getSupabase()
      .from("employees")
      .delete()
      .eq("id", employeeId);

    if (deleteError) {
      console.error("Error deleting employee:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete employee" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/employees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
