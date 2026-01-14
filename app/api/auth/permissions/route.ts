import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getUserPermissions } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUser();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        isSuperAdmin: false,
        hasOrg: false,
        orgRole: null,
      });
    }

    const permissions = await getUserPermissions(user.id);

    return NextResponse.json({
      authenticated: true,
      isSuperAdmin: permissions?.isSuperAdmin ?? false,
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
