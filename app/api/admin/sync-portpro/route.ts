import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPortProClient, mapPortProStatus, PortProLoad } from "@/lib/portpro";

// Secret key for API access (set in env vars)
const SYNC_SECRET = process.env.ADMIN_SYNC_SECRET || "nsl-sync-secret-2024";

export async function POST(request: NextRequest) {
  try {
    // Check authorization via header or query param
    const authHeader = request.headers.get("x-sync-secret");
    const { searchParams } = new URL(request.url);
    const querySecret = searchParams.get("secret");

    // Allow access if secret matches (for API calls) or if called from same origin (browser)
    const isValidSecret = authHeader === SYNC_SECRET || querySecret === SYNC_SECRET;
    const isFromSameOrigin = request.headers.get("sec-fetch-site") === "same-origin";

    if (!isValidSecret && !isFromSameOrigin) {
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
      console.error("PortPro client error:", error);
      return NextResponse.json(
        { error: "PortPro not configured", details: error instanceof Error ? error.message : "Unknown" },
        { status: 503 }
      );
    }

    // Parse request body for options
    const body = await request.json().catch(() => ({}));
    const { limit = 50, skip = 0 } = body;

    // Fetch loads from PortPro
    console.log(`Fetching loads from PortPro (skip: ${skip}, limit: ${limit})...`);

    let loads: PortProLoad[];
    try {
      loads = await portpro.getLoads({ skip, limit });
    } catch (fetchError) {
      console.error("PortPro fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch loads from PortPro", details: fetchError instanceof Error ? fetchError.message : "Unknown" },
        { status: 500 }
      );
    }

    console.log(`Fetched ${loads.length} loads from PortPro`);

    if (loads.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No loads found in PortPro",
        total: 0,
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

        // Check if shipment already exists by container_number
        const { data: existing, error: selectError } = await supabase
          .from("shipments")
          .select("id")
          .eq("container_number", load.containerNo)
          .limit(1);

        if (selectError) {
          console.error(`Error checking existing shipment:`, selectError);
          errors++;
          errorDetails.push(`Select ${load.reference_number}: ${selectError.message}`);
          continue;
        }

        // Base shipment data (only columns that definitely exist)
        const baseShipmentData = {
          container_number: load.containerNo,
          status: mapPortProStatus(load.status),
          current_location: getLoadLocation(load),
          public_notes: `PortPro: ${load.reference_number} - ${load.type_of_load}`,
          updated_at: new Date().toISOString(),
        };

        if (existing && existing.length > 0) {
          // Update existing shipment
          const { error: updateError } = await supabase
            .from("shipments")
            .update(baseShipmentData)
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
          const { error: insertError } = await supabase
            .from("shipments")
            .insert(baseShipmentData);

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

// GET endpoint to check PortPro connection
export async function GET() {
  try {
    let portpro;
    try {
      portpro = getPortProClient();
    } catch (error) {
      return NextResponse.json(
        { error: "PortPro not configured", details: error instanceof Error ? error.message : "Unknown" },
        { status: 503 }
      );
    }

    // Test connection by fetching one load
    const loads = await portpro.getLoads({ limit: 1 });

    return NextResponse.json({
      success: true,
      configured: true,
      message: "PortPro connection successful",
      sampleLoad: loads.length > 0 ? { reference: loads[0].reference_number, container: loads[0].containerNo } : null,
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
  const status = load.status;

  if (status === "PENDING" || status === "CUSTOMS HOLD" || status === "FREIGHT HOLD" || status === "AVAILABLE") {
    return load.shipper?.company_name || "At Port";
  }

  if (status === "DISPATCHED") {
    return "In Transit";
  }

  if (status === "DROPPED" || status === "COMPLETED" || status === "BILLING") {
    return load.consignee?.company_name || "Delivered";
  }

  return null;
}
