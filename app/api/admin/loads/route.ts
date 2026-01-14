import { NextRequest, NextResponse } from "next/server";
import { isAdmin, createUntypedAdminClient } from "@/lib/supabase/server";

const supabase = createUntypedAdminClient();

// Read-only endpoint - shipments are synced from PortPro
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("loads")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching shipments:", error);
      return NextResponse.json(
        { error: "Failed to fetch loads" },
        { status: 500 }
      );
    }

    return NextResponse.json({ shipments: data });
  } catch (error) {
    console.error("Error in GET /api/admin/loads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
