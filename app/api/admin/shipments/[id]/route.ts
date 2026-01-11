import { NextRequest, NextResponse } from "next/server";
import { isAdmin, createUntypedAdminClient } from "@/lib/supabase/server";

const supabase = createUntypedAdminClient();

// Read-only endpoint - shipment data comes from PortPro
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
      .from("shipments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching shipment:", error);
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ shipment: data });
  } catch (error) {
    console.error("Error in GET /api/admin/shipments/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
