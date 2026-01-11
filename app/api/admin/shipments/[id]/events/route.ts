import { NextRequest, NextResponse } from "next/server";
import { isAdmin, createUntypedAdminClient } from "@/lib/supabase/server";

const supabase = createUntypedAdminClient();

// Read-only endpoint - events come from PortPro
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data, error } = await supabase
      .from("shipment_events")
      .select("*")
      .eq("shipment_id", id)
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
    console.error("Error in GET /api/admin/shipments/[id]/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
