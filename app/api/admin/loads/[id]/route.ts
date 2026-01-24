import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/auth";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: ReturnType<typeof createUntypedAdminClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createUntypedAdminClient();
  }
  return _supabase;
}

// Read-only endpoint - shipment data comes from PortPro
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await hasModuleAccess("loads"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await getSupabase()
      .from("loads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching shipment:", error);
      return NextResponse.json(
        { error: "Load not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ shipment: data });
  } catch (error) {
    console.error("Error in GET /api/admin/loads/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
