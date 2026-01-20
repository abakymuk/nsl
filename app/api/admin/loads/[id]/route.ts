import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/auth";

const supabase = createUntypedAdminClient();

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

    const { data, error } = await supabase
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
