import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getUserPermissions, isEmployee, getEmployeePermissions } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        isSuperAdmin: false,
        isPlatformEmployee: false,
        hasOrg: false,
        orgRole: null,
      });
    }

    const [permissions, isPlatformEmployee, employeePermissions] = await Promise.all([
      getUserPermissions(user.id),
      isEmployee(user.id),
      getEmployeePermissions(user.id),
    ]);

    return NextResponse.json({
      authenticated: true,
      isSuperAdmin: permissions?.isSuperAdmin ?? false,
      isPlatformEmployee,
      employeePermissions,
      hasOrg: !!permissions?.organization,
      orgRole: permissions?.orgRole,
      orgName: permissions?.organization?.name,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}
