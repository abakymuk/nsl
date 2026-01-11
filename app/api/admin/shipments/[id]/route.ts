import { NextRequest, NextResponse } from "next/server";
import { isAdmin, createUntypedAdminClient } from "@/lib/supabase/server";

const supabase = createUntypedAdminClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, eta, notes } = body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;

      // Add a tracking event for the status change
      const statusDescriptions: Record<string, string> = {
        booked: "Shipment booked and confirmed",
        at_port: "Container arrived at port",
        in_transit: "Container in transit",
        out_for_delivery: "Container out for delivery",
        delivered: "Shipment delivered successfully",
        cancelled: "Shipment cancelled",
      };

      await supabase.from("shipment_events").insert({
        shipment_id: id,
        status,
        description: statusDescriptions[status] || `Status updated to ${status}`,
      });
    }

    if (eta !== undefined) {
      updateData.eta = eta;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data, error } = await supabase
      .from("shipments")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating shipment:", error);
      return NextResponse.json(
        { error: "Failed to update shipment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, shipment: data });
  } catch (error) {
    console.error("Error in PATCH /api/admin/shipments/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
