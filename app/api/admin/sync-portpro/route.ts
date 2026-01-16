import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
import { getPortProClient, mapPortProStatus, formatLocation, extractLookupValue, PortProLoad, PortProDriverOrder, PortProMove, PortProLocation } from "@/lib/portpro";

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
// PortPro driverOrder structure: each entry can be a driver assignment with nested moves,
// OR each entry might itself be a stop/move. We handle both cases.
async function syncTrackingEvents(loadId: string, driverOrders: PortProDriverOrder[]) {
  console.log(`Syncing ${driverOrders.length} driver orders for load ${loadId}`);
  console.log(`DriverOrder sample:`, JSON.stringify(driverOrders[0], null, 2));

  // First, clear existing portpro tracking events for this load (to avoid duplicates)
  await supabase
    .from("load_events")
    .delete()
    .eq("load_id", loadId)
    .in("event_type", ["move_start", "stop"]);

  let totalEventsCreated = 0;

  // Group driver orders by moveNumber to identify actual moves
  const moveGroups = new Map<number, PortProDriverOrder[]>();
  driverOrders.forEach((order, idx) => {
    // Use moveNumber if available, otherwise use index + 1
    const moveNum = order.moveNumber || Math.floor(idx / 5) + 1; // Assume ~5 stops per move as fallback
    if (!moveGroups.has(moveNum)) {
      moveGroups.set(moveNum, []);
    }
    moveGroups.get(moveNum)!.push(order);
  });

  // If all orders have moveNumber=1 or undefined, treat each order as a stop in a single move
  const uniqueMoveNumbers = new Set(driverOrders.map(o => o.moveNumber || 1));
  const treatAsStops = uniqueMoveNumbers.size === 1 && driverOrders.length > 1;

  if (treatAsStops) {
    // All driverOrders are stops within a single move
    console.log(`Treating ${driverOrders.length} driver orders as stops in a single move`);

    // Get driver info from first order
    const firstOrder = driverOrders[0];
    const driverName = getDriverName(firstOrder);
    const driverId = firstOrder.driver?._id || null;
    const driverAvatar = firstOrder.driver?.profilePicture || null;

    // Create single move_start event
    const moveStartEvent = {
      load_id: loadId,
      event_type: "move_start",
      status: "in_progress",
      description: `Container Move 1 - ${driverName}`,
      move_number: 1,
      driver_id: driverId,
      driver_name: driverName,
      driver_avatar: driverAvatar,
      distance_miles: driverOrders.reduce((sum, o) => sum + (o.distance || 0), 0) || null,
      portpro_move_id: firstOrder._id,
      created_at: new Date().toISOString(),
    };

    const { error: moveError } = await supabase
      .from("load_events")
      .insert(moveStartEvent);

    if (!moveError) totalEventsCreated++;

    // Create stop events for each driver order
    for (let i = 0; i < driverOrders.length; i++) {
      const order = driverOrders[i];
      const stopNumber = i + 1;

      // Try to extract stop info from the driverOrder itself
      // PortPro might store stop data directly on driverOrder or in nested moves
      const stopEvent = createStopEventFromDriverOrder(loadId, order, 1, stopNumber);
      if (stopEvent) {
        const { error } = await supabase.from("load_events").insert(stopEvent);
        if (!error) totalEventsCreated++;
      }

      // Also process nested moves if they exist
      if (order.moves && order.moves.length > 0) {
        for (let j = 0; j < order.moves.length; j++) {
          const move = order.moves[j];
          const nestedStopEvent = createStopEventFromMove(loadId, move, order, 1, stopNumber + j);
          if (nestedStopEvent) {
            const { error } = await supabase.from("load_events").insert(nestedStopEvent);
            if (!error) totalEventsCreated++;
          }
        }
      }
    }
  } else {
    // Multiple moves - process each move group
    console.log(`Processing ${moveGroups.size} distinct moves`);

    for (const [moveNumber, orders] of moveGroups) {
      const firstOrder = orders[0];
      const driverName = getDriverName(firstOrder);
      const driverId = firstOrder.driver?._id || null;
      const driverAvatar = firstOrder.driver?.profilePicture || null;

      // Determine move status
      const allCompleted = orders.every(o =>
        o.status?.toLowerCase() === "completed" || o.status?.toLowerCase() === "delivered"
      );
      const anyActive = orders.some(o =>
        o.status?.toLowerCase() === "in_progress" || o.status?.toLowerCase() === "dispatched"
      );

      // Create move_start event
      const moveStartEvent = {
        load_id: loadId,
        event_type: "move_start",
        status: allCompleted ? "completed" : anyActive ? "in_progress" : "pending",
        description: `Container Move ${moveNumber} - ${driverName}`,
        move_number: moveNumber,
        driver_id: driverId,
        driver_name: driverName,
        driver_avatar: driverAvatar,
        distance_miles: orders.reduce((sum, o) => sum + (o.distance || 0), 0) || null,
        portpro_move_id: firstOrder._id,
        created_at: new Date().toISOString(),
      };

      const { error: moveError } = await supabase.from("load_events").insert(moveStartEvent);
      if (!moveError) totalEventsCreated++;

      // Create stops from orders and their nested moves
      let stopCounter = 1;
      for (const order of orders) {
        // Process nested moves
        if (order.moves && order.moves.length > 0) {
          for (const move of order.moves) {
            const stopEvent = createStopEventFromMove(loadId, move, order, moveNumber, stopCounter);
            if (stopEvent) {
              const { error } = await supabase.from("load_events").insert(stopEvent);
              if (!error) {
                totalEventsCreated++;
                stopCounter++;
              }
            }
          }
        } else {
          // No nested moves - treat the order itself as a stop
          const stopEvent = createStopEventFromDriverOrder(loadId, order, moveNumber, stopCounter);
          if (stopEvent) {
            const { error } = await supabase.from("load_events").insert(stopEvent);
            if (!error) {
              totalEventsCreated++;
              stopCounter++;
            }
          }
        }
      }
    }
  }

  console.log(`Created ${totalEventsCreated} tracking events for load ${loadId}`);
}

// Helper to get driver name from various possible fields
function getDriverName(order: PortProDriverOrder): string {
  if (order.driver?.name) return order.driver.name;
  if (order.driver?.firstName && order.driver?.lastName) {
    return `${order.driver.firstName} ${order.driver.lastName}`;
  }
  if (order.driver?.firstName) return order.driver.firstName;
  // Check if driver info is stored differently
  const anyOrder = order as unknown as Record<string, unknown>;
  if (typeof anyOrder.driverName === "string") return anyOrder.driverName;
  return "Unknown Driver";
}

// Create stop event from a PortProMove (nested in driverOrder)
function createStopEventFromMove(
  loadId: string,
  move: PortProMove,
  order: PortProDriverOrder,
  moveNumber: number,
  stopNumber: number
): Record<string, unknown> | null {
  const location = formatMoveLocation(move);
  const stopType = mapMoveTypeToStopType(move.type);
  const driverName = getDriverName(order);

  // Determine stop status
  const isCompleted = move.isCompleted === true || move.status === "COMPLETED";
  const hasArrived = !!move.arrived;

  // Calculate duration
  let durationMinutes: number | null = null;
  if (move.arrived && move.departed) {
    durationMinutes = Math.round(
      (new Date(move.departed).getTime() - new Date(move.arrived).getTime()) / (1000 * 60)
    );
  } else if (move.duration) {
    durationMinutes = move.duration;
  }

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

  return {
    load_id: loadId,
    event_type: "stop",
    status: isCompleted ? "completed" : hasArrived ? "in_progress" : "pending",
    description: `${description}${location.name ? ` at ${location.name}` : ""}`,
    move_number: moveNumber,
    stop_number: stopNumber,
    stop_type: stopType,
    location_name: location.name,
    location_address: location.address,
    driver_id: order.driver?._id || null,
    driver_name: driverName,
    driver_avatar: order.driver?.profilePicture || null,
    arrival_time: move.arrived || null,
    departure_time: move.departed || null,
    duration_minutes: durationMinutes,
    distance_miles: move.distance || null,
    portpro_move_id: order._id,
    portpro_stop_id: move._id,
    created_at: move.arrived || move.appointmentFrom || new Date().toISOString(),
  };
}

// Create stop event from driverOrder itself (when no nested moves)
function createStopEventFromDriverOrder(
  loadId: string,
  order: PortProDriverOrder,
  moveNumber: number,
  stopNumber: number
): Record<string, unknown> | null {
  const anyOrder = order as unknown as Record<string, unknown>;
  const driverName = getDriverName(order);

  // Try to extract location info from various possible fields
  let locationName: string | null = null;
  let locationAddress: string | null = null;
  let stopType: string | null = null;

  // Check for type field on the order itself
  if (typeof anyOrder.type === "string") {
    stopType = mapMoveTypeToStopType(anyOrder.type);
  }

  // Check for location/address fields
  if (typeof anyOrder.company_name === "string") {
    locationName = anyOrder.company_name;
  }
  if (anyOrder.address && typeof anyOrder.address === "object") {
    const addr = anyOrder.address as PortProLocation;
    locationName = locationName || addr.company_name || null;
    if (addr.address) {
      const parts: string[] = [];
      if (addr.address.address1) parts.push(addr.address.address1);
      if (addr.address.city) parts.push(addr.address.city);
      if (addr.address.state) parts.push(addr.address.state);
      locationAddress = parts.join(", ") || null;
    }
  }

  // Check for arrival/departure times
  const arrived = anyOrder.arrived as string | undefined;
  const departed = anyOrder.departed as string | undefined;
  const isCompleted = anyOrder.isCompleted === true || order.status === "COMPLETED";
  const hasArrived = !!arrived;

  // Calculate duration
  let durationMinutes: number | null = null;
  if (arrived && departed) {
    durationMinutes = Math.round(
      (new Date(departed).getTime() - new Date(arrived).getTime()) / (1000 * 60)
    );
  }

  const stopTypeLabels: Record<string, string> = {
    pickup: "Pick Up Container",
    hook: "Hook Container",
    drop: "Drop Container",
    deliver: "Deliver Container",
    return: "Return Container",
  };
  const description = stopType
    ? stopTypeLabels[stopType] || (anyOrder.type as string) || "Stop"
    : (anyOrder.type as string) || `Stop ${stopNumber}`;

  return {
    load_id: loadId,
    event_type: "stop",
    status: isCompleted ? "completed" : hasArrived ? "in_progress" : "pending",
    description: `${description}${locationName ? ` at ${locationName}` : ""}`,
    move_number: moveNumber,
    stop_number: stopNumber,
    stop_type: stopType,
    location_name: locationName,
    location_address: locationAddress,
    driver_id: order.driver?._id || null,
    driver_name: driverName,
    driver_avatar: order.driver?.profilePicture || null,
    arrival_time: arrived || null,
    departure_time: departed || null,
    duration_minutes: durationMinutes,
    distance_miles: order.distance || null,
    portpro_move_id: order._id,
    portpro_stop_id: order._id,
    created_at: arrived || new Date().toISOString(),
  };
}
