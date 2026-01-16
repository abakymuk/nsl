import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { getPortProClient, mapPortProStatus, formatLocation, extractLookupValue, PortProLoad, PortProDriverOrder, PortProMove } from "@/lib/portpro";

const supabase = createUntypedAdminClient();

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

        // Check if load already exists by container_number
        const { data: existing, error: selectError } = await supabase
          .from("loads")
          .select("id")
          .eq("container_number", load.containerNo)
          .limit(1);

        if (selectError) {
          console.error(`Error checking existing shipment:`, selectError);
          errors++;
          errorDetails.push(`Select ${load.reference_number}: ${selectError.message}`);
          continue;
        }

        // Generate tracking number for new loads
        const trackingNumber = `NSL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Determine locations using the formatLocation helper
        const pickupLocation = formatLocation(load.pickupLocation)
          || formatLocation(load.shipper)
          || formatLocation(load.terminal);

        const deliveryLocation = formatLocation(load.deliveryLocation)
          || formatLocation(load.consignee);

        const returnLocation = formatLocation(load.returnLocation);

        // Full shipment data from PortPro with all available fields
        const shipmentData = {
          // Container info
          container_number: load.containerNo,
          container_size: extractLookupValue(load.containerSize ?? null),
          container_type: extractLookupValue(load.containerType ?? null),
          // Status & location
          status: mapPortProStatus(load.status),
          current_location: getLoadLocation(load),
          // Locations (addresses)
          origin: pickupLocation,
          destination: deliveryLocation,
          return_location: returnLocation,
          // Customer info
          customer_name: load.caller?.company_name || null,
          customer_email: load.caller?.email || null,
          customer_phone: load.caller?.phone || null,
          // Booking & shipping
          booking_number: load.bookingNo || null,
          shipping_line: load.ssl || null,
          commodity: load.commodity || null,
          // Dates
          eta: load.deliveryTimes?.[0]?.deliveryFromTime || null,
          pickup_time: load.pickupTimes?.[0]?.pickupFromTime || null,
          last_free_day: load.lastFreeDay || null,
          // Equipment
          weight: load.weight || null,
          seal_number: load.sealNo || null,
          chassis_number: load.chassisNo || null,
          // Distance
          total_miles: load.totalMiles || null,
          // PortPro reference
          portpro_reference: load.reference_number,
          portpro_load_id: load._id,
          // Notes
          public_notes: `PortPro: ${load.reference_number} - ${load.type_of_load}`,
          updated_at: new Date().toISOString(),
        };

        let loadId: string;

        if (existing && existing.length > 0) {
          // Update existing shipment (don't change tracking_number)
          const { error: updateError } = await supabase
            .from("loads")
            .update(shipmentData)
            .eq("id", existing[0].id);

          if (updateError) {
            console.error(`Error updating shipment for ${load.reference_number}:`, updateError);
            errors++;
            errorDetails.push(`Update ${load.reference_number}: ${updateError.message}`);
            continue;
          }
          loadId = existing[0].id;
          console.log(`Updated shipment for ${load.reference_number}`);
        } else {
          // Create new shipment with tracking number
          const { data: newLoad, error: insertError } = await supabase
            .from("loads")
            .insert({
              ...shipmentData,
              tracking_number: trackingNumber,
            })
            .select("id")
            .single();

          if (insertError || !newLoad) {
            console.error(`Error creating shipment for ${load.reference_number}:`, insertError);
            errors++;
            errorDetails.push(`Insert ${load.reference_number}: ${insertError?.message || "Unknown"}`);
            continue;
          }
          loadId = newLoad.id;
          console.log(`Created shipment for ${load.reference_number} (${load.containerNo}) - Tracking: ${trackingNumber}`);
        }

        // Sync tracking events from driverOrder
        if (load.driverOrder && load.driverOrder.length > 0) {
          await syncTrackingEvents(loadId, load.driverOrder);
        }

        synced++;
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

// Map PortPro move type to our stop_type
function mapMoveTypeToStopType(moveType?: string): string | null {
  if (!moveType) return null;
  const typeMap: Record<string, string> = {
    PULLCONTAINER: "pickup",
    HOOKCONTAINER: "hook",
    DROPCONTAINER: "drop",
    DELIVERLOAD: "deliver",
    RETURNCONTAINER: "return",
    GETLOADED: "pickup",
    GETUNLOADED: "deliver",
  };
  return typeMap[moveType.toUpperCase()] || null;
}

// Format location from PortPro move address
function formatMoveLocation(move: PortProMove): { name: string | null; address: string | null } {
  const name = move.company_name || move.address?.company_name || null;
  let address: string | null = null;

  if (move.address?.address) {
    const addr = move.address.address;
    const parts: string[] = [];
    if (addr.address1) parts.push(addr.address1);
    if (addr.city) parts.push(addr.city);
    if (addr.state) {
      if (addr.zip) {
        parts.push(`${addr.state} ${addr.zip}`);
      } else {
        parts.push(addr.state);
      }
    }
    address = parts.length > 0 ? parts.join(", ") : null;
  } else if (move.address?.fullAddress) {
    address = move.address.fullAddress;
  }

  return { name, address };
}

// Sync tracking events from PortPro driverOrder to load_events
async function syncTrackingEvents(loadId: string, driverOrders: PortProDriverOrder[]) {
  console.log(`Syncing ${driverOrders.length} driver orders for load ${loadId}`);

  // First, clear existing portpro tracking events for this load (to avoid duplicates)
  await supabase
    .from("load_events")
    .delete()
    .eq("load_id", loadId)
    .in("event_type", ["move_start", "stop"]);

  let totalEventsCreated = 0;

  for (const driverOrder of driverOrders) {
    const moveNumber = driverOrder.moveNumber || 1;
    const driverName = driverOrder.driver?.name
      || (driverOrder.driver?.firstName && driverOrder.driver?.lastName
        ? `${driverOrder.driver.firstName} ${driverOrder.driver.lastName}`
        : null)
      || "Unknown Driver";
    const driverAvatar = driverOrder.driver?.profilePicture || null;
    const driverId = driverOrder.driver?._id || null;

    // Determine move status
    const moveStatus = driverOrder.status?.toLowerCase() || "pending";
    const isMoveCompleted = moveStatus === "completed" || moveStatus === "delivered";
    const isMoveActive = moveStatus === "in_progress" || moveStatus === "dispatched";

    // Create move start event
    const moveStartEvent = {
      load_id: loadId,
      event_type: "move_start",
      status: isMoveCompleted ? "completed" : isMoveActive ? "in_progress" : "pending",
      description: `Container Move ${moveNumber} - ${driverName}`,
      move_number: moveNumber,
      driver_id: driverId,
      driver_name: driverName,
      driver_avatar: driverAvatar,
      distance_miles: driverOrder.distance || null,
      portpro_move_id: driverOrder._id,
      created_at: new Date().toISOString(),
    };

    const { error: moveError } = await supabase
      .from("load_events")
      .insert(moveStartEvent);

    if (moveError) {
      console.error(`Error creating move start event:`, moveError);
    } else {
      totalEventsCreated++;
    }

    // Process stops/moves within this driver order
    if (driverOrder.moves && driverOrder.moves.length > 0) {
      for (let i = 0; i < driverOrder.moves.length; i++) {
        const move = driverOrder.moves[i];
        const stopNumber = i + 1;
        const location = formatMoveLocation(move);
        const stopType = mapMoveTypeToStopType(move.type);

        // Determine stop status
        const isStopCompleted = move.isCompleted === true || move.status === "COMPLETED";
        const hasArrived = !!move.arrived;

        // Calculate duration if both arrived and departed
        let durationMinutes: number | null = null;
        if (move.arrived && move.departed) {
          const arrivedTime = new Date(move.arrived).getTime();
          const departedTime = new Date(move.departed).getTime();
          durationMinutes = Math.round((departedTime - arrivedTime) / (1000 * 60));
        } else if (move.duration) {
          durationMinutes = move.duration;
        }

        // Build description based on stop type
        const stopTypeLabels: Record<string, string> = {
          pickup: "Pick Up Container",
          hook: "Hook Container",
          drop: "Drop Container",
          deliver: "Deliver Container",
          return: "Return Container",
        };
        const description = stopType
          ? stopTypeLabels[stopType] || move.type || "Stop"
          : move.type || "Stop";

        const stopEvent = {
          load_id: loadId,
          event_type: "stop",
          status: isStopCompleted ? "completed" : hasArrived ? "in_progress" : "pending",
          description: `${description}${location.name ? ` at ${location.name}` : ""}`,
          move_number: moveNumber,
          stop_number: stopNumber,
          stop_type: stopType,
          location_name: location.name,
          location_address: location.address,
          driver_id: driverId,
          driver_name: driverName,
          driver_avatar: driverAvatar,
          arrival_time: move.arrived || null,
          departure_time: move.departed || null,
          duration_minutes: durationMinutes,
          distance_miles: move.distance || null,
          portpro_move_id: driverOrder._id,
          portpro_stop_id: move._id,
          created_at: move.arrived || move.appointmentFrom || new Date().toISOString(),
        };

        const { error: stopError } = await supabase
          .from("load_events")
          .insert(stopEvent);

        if (stopError) {
          console.error(`Error creating stop event:`, stopError);
        } else {
          totalEventsCreated++;
        }
      }
    }
  }

  console.log(`Created ${totalEventsCreated} tracking events for load ${loadId}`);
}
