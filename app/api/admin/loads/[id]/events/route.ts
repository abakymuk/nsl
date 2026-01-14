import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";

const supabase = createUntypedAdminClient();

// Read-only endpoint - events come from PortPro
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
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

    return NextResponse.json({ events: data });
  } catch (error) {
    console.error("Error in GET /api/admin/loads/[id]/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
