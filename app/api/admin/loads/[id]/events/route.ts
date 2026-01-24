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

// Read-only endpoint - events come from PortPro
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await hasModuleAccess("loads"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await getSupabase()
      .from("load_events")
      .select("*")
      .eq("load_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ events: data });
    // Cache events for 2 minutes (private - admin only)
    response.headers.set("Cache-Control", "private, max-age=120, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("Error in GET /api/admin/loads/[id]/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
