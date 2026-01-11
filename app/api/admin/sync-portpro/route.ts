import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { getPortProClient, mapPortProStatus, PortProLoad } from "@/lib/portpro";

// Admin emails that can trigger sync
const ADMIN_EMAILS = [
  "andriy@newstreamgroup.com",
  "admin@newstream-logistics.com",
];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get PortPro client
    let portpro;
    try {
      portpro = getPortProClient();
    } catch (error) {
      return NextResponse.json(
        { error: "PortPro not configured" },
        { status: 503 }
      );
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { limit = 100, skip = 0, status } = body;

    // Fetch loads from PortPro
    console.log(`Fetching loads from PortPro (skip: ${skip}, limit: ${limit})...`);

    const loads = await portpro.getLoads({
      skip,
      limit,
      status,
    });

    console.log(`Fetched ${loads.length} loads from PortPro`);

    if (loads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No loads found in PortPro",
        synced: 0,
        skipped: 0,
        errors: 0,
      });
    }

    let synced = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process each load
    for (const load of loads) {
      try {
        // Skip loads without container number
        if (!load.containerNo) {
          console.log(`Skipping load ${load.reference_number} - no container number`);
          skipped++;
          continue;
        }

        // Check if shipment already exists (by portpro_reference or container_number)
        const { data: existing } = await supabase
          .from("shipments")
          .select("id")
          .or(`portpro_reference.eq.${load.reference_number},container_number.eq.${load.containerNo}`)
          .limit(1);

        if (existing && existing.length > 0) {
          // Update existing shipment
          const { error: updateError } = await supabase
            .from("shipments")
            .update({
              portpro_load_id: load._id,
              portpro_reference: load.reference_number,
              container_number: load.containerNo,
              container_size: load.containerSize || null,
              status: mapPortProStatus(load.status),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing[0].id);

          if (updateError) {
            console.error(`Error updating shipment for ${load.reference_number}:`, updateError);
            errors++;
            errorDetails.push(`Update ${load.reference_number}: ${updateError.message}`);
          } else {
            console.log(`Updated shipment for ${load.reference_number}`);
            synced++;
          }
        } else {
          // Create new shipment
          const shipmentData = {
            portpro_load_id: load._id,
            portpro_reference: load.reference_number,
            container_number: load.containerNo,
            container_size: load.containerSize || null,
            status: mapPortProStatus(load.status),
            current_location: getLoadLocation(load),
            driver_name: null,
            public_notes: `Imported from PortPro - ${load.type_of_load} load`,
          };

          const { error: insertError } = await supabase
            .from("shipments")
            .insert(shipmentData);

          if (insertError) {
            console.error(`Error creating shipment for ${load.reference_number}:`, insertError);
            errors++;
            errorDetails.push(`Insert ${load.reference_number}: ${insertError.message}`);
          } else {
            console.log(`Created shipment for ${load.reference_number} (${load.containerNo})`);
            synced++;
          }
        }
      } catch (loadError) {
        console.error(`Error processing load ${load.reference_number}:`, loadError);
        errors++;
        errorDetails.push(`Process ${load.reference_number}: ${loadError instanceof Error ? loadError.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed`,
      total: loads.length,
      synced,
      skipped,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 10) : undefined,
      hasMore: loads.length === limit,
      nextSkip: skip + loads.length,
    });

  } catch (error) {
    console.error("PortPro sync error:", error);
    return NextResponse.json(
      {
        error: "Sync failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status / fetch load count
export async function GET() {
  try {
    let portpro;
    try {
      portpro = getPortProClient();
    } catch (error) {
      return NextResponse.json(
        { error: "PortPro not configured" },
        { status: 503 }
      );
    }

    // Fetch a small batch to get count
    const loads = await portpro.getLoads({ limit: 1 });

    return NextResponse.json({
      success: true,
      configured: true,
      message: "PortPro connection successful",
    });

  } catch (error) {
    console.error("PortPro check error:", error);
    return NextResponse.json(
      {
        error: "PortPro connection failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

function getLoadLocation(load: PortProLoad): string | null {
  // Determine current location based on status
  const status = load.status;

  if (status === "PENDING" || status === "CUSTOMS HOLD" || status === "FREIGHT HOLD" || status === "AVAILABLE") {
    return load.shipper?.company_name || load.shipper?.address || "At Port";
  }

  if (status === "DISPATCHED") {
    return "In Transit";
  }

  if (status === "DROPPED" || status === "COMPLETED" || status === "BILLING") {
    return load.consignee?.company_name || load.consignee?.address || "Delivered";
  }

  return null;
}
