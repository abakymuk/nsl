/**
 * Load/Tracking Helper Functions
 *
 * Utilities for parsing and formatting load data, converting events
 * to tracking moves, and other load-related operations.
 */

// ============================================================
// TYPES
// ============================================================

export interface TrackingStop {
  id: string;
  stopNumber: number;
  type: "pickup" | "drop" | "hook" | "deliver" | "return" | "yard" | "terminal";
  locationName: string;
  locationAddress?: string;
  startTime?: string;
  arrivalTime?: string;
  departureTime?: string;
  durationMinutes?: number;
  distanceMiles?: number;
  isCompleted: boolean;
  isActive: boolean;
}

export interface TrackingMove {
  id: string;
  moveNumber: number;
  driverName: string;
  driverAvatar?: string;
  driverId?: string;
  status: "completed" | "in_progress" | "pending";
  totalDistance?: number;
  stops: TrackingStop[];
}

// ============================================================
// CONTAINER FIELD PARSING
// ============================================================

/**
 * Parse container size/type that might be stored as JSON string or object.
 * Handles various formats from PortPro and manual entry.
 */
export function parseContainerField(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    // Check if it's a JSON string
    if (value.startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        return parsed.label || parsed.name || null;
      } catch (error) {
        // Log malformed JSON for debugging, return raw value as fallback
        console.error("Failed to parse container field JSON:", { value, error });
        return value;
      }
    }
    return value;
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as { label?: string; name?: string };
    return obj.label || obj.name || null;
  }
  return null;
}

/**
 * Format container size and type for display.
 * Maps abbreviations to full names.
 */
export function formatContainerInfo(size: unknown, type: unknown): string | null {
  const sizeStr = parseContainerField(size);
  const typeStr = parseContainerField(type);

  if (!sizeStr && !typeStr) return null;

  // Map common abbreviations to full names
  const typeLabels: Record<string, string> = {
    HC: "High Cube",
    ST: "Standard",
    RF: "Reefer",
    "High Cube": "High Cube",
    Standard: "Standard",
    Reefer: "Reefer",
  };

  const formattedType = typeStr ? (typeLabels[typeStr] || typeStr) : null;

  if (sizeStr && formattedType) {
    return `${sizeStr} ${formattedType}`;
  }
  return sizeStr || formattedType;
}

// ============================================================
// LOCATION PARSING
// ============================================================

/**
 * Parse location string that may have company name on first line,
 * address on subsequent lines.
 */
export function parseLocation(
  loc: string | null | undefined
): { name: string; address?: string } | null {
  if (!loc || typeof loc !== "string") return null;
  const lines = loc.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return null;
  return {
    name: lines[0],
    address: lines.slice(1).join(", ") || undefined,
  };
}

// ============================================================
// EVENT TO TRACKING CONVERSION
// ============================================================

/**
 * Convert load events to tracking moves format for timeline display.
 */
export function convertEventsToTrackingMoves(
  events: Array<Record<string, unknown>>,
  load: Record<string, unknown>
): TrackingMove[] {
  // Sort events chronologically (oldest first) for tracking timeline
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.created_at as string).getTime();
    const dateB = new Date(b.created_at as string).getTime();
    return dateA - dateB;
  });

  // Filter for tracking events (stops and move_starts)
  const stopEvents = sortedEvents.filter((e) => e.event_type === "stop");
  const moveStartEvents = sortedEvents.filter((e) => e.event_type === "move_start");

  if (stopEvents.length === 0 && moveStartEvents.length === 0) {
    // If no detailed tracking events, create a basic tracking view from load data
    return createBasicTrackingFromLoad(load);
  }

  // Group stops by move number
  const moveGroups = new Map<number, Array<Record<string, unknown>>>();
  stopEvents.forEach((event) => {
    const moveNum = (event.move_number as number) || 1;
    if (!moveGroups.has(moveNum)) {
      moveGroups.set(moveNum, []);
    }
    moveGroups.get(moveNum)!.push(event);
  });

  // Get move_start metadata (driver info, total distance) indexed by move number
  const moveStartMap = new Map<number, Record<string, unknown>>();
  moveStartEvents.forEach((event) => {
    const moveNum = (event.move_number as number) || 1;
    moveStartMap.set(moveNum, event);
  });

  // Convert to TrackingMove format
  const moves: TrackingMove[] = [];

  // Process all move numbers from either stops or move_starts
  const allMoveNumbers = new Set([...moveGroups.keys(), ...moveStartMap.keys()]);

  allMoveNumbers.forEach((moveNumber) => {
    const groupStops = moveGroups.get(moveNumber) || [];
    const moveStartEvent = moveStartMap.get(moveNumber);

    // Sort stops by stop_number
    const sortedStops = [...groupStops].sort(
      (a, b) => ((a.stop_number as number) || 0) - ((b.stop_number as number) || 0)
    );

    const stops: TrackingStop[] = sortedStops.map((event, idx) => {
      const isCompleted = event.status === "completed" || !!event.departure_time;
      const isActive =
        event.status === "in_progress" || (!event.departure_time && !!event.arrival_time);

      return {
        id: event.id as string,
        stopNumber: (event.stop_number as number) || idx + 1,
        type: (event.stop_type as TrackingStop["type"]) || "terminal",
        locationName:
          (event.location_name as string) || (event.location as string) || "Unknown",
        locationAddress: event.location_address as string | undefined,
        startTime: event.start_time as string | undefined,
        arrivalTime: event.arrival_time as string | undefined,
        departureTime: event.departure_time as string | undefined,
        durationMinutes: event.duration_minutes as number | undefined,
        distanceMiles: event.distance_miles as number | undefined,
        isCompleted,
        isActive,
      };
    });

    // Use move_start event for driver info if available, otherwise use first stop
    const driverSource = moveStartEvent || sortedStops[0] || {};

    // Determine move status
    let moveStatus: "completed" | "in_progress" | "pending" = "pending";
    if (moveStartEvent?.status === "completed" || stops.every((s) => s.isCompleted)) {
      moveStatus = "completed";
    } else if (
      moveStartEvent?.status === "in_progress" ||
      stops.some((s) => s.isActive || s.isCompleted)
    ) {
      moveStatus = "in_progress";
    }

    // Calculate total distance from move_start or sum of stops
    const totalDistance =
      (moveStartEvent?.distance_miles as number) ||
      stops.reduce((sum, s) => sum + (s.distanceMiles || 0), 0) ||
      undefined;

    moves.push({
      id: `move-${moveNumber}`,
      moveNumber,
      driverName: (driverSource.driver_name as string) || "Pending Assignment",
      driverAvatar: driverSource.driver_avatar as string | undefined,
      driverId: driverSource.driver_id as string | undefined,
      status: moveStatus,
      totalDistance,
      stops,
    });
  });

  return moves.sort((a, b) => a.moveNumber - b.moveNumber);
}

/**
 * Create basic tracking from load origin/destination when no detailed events exist.
 */
export function createBasicTrackingFromLoad(load: Record<string, unknown>): TrackingMove[] {
  const status = (load.status as string) || "booked";
  const isDelivered = ["delivered", "completed"].includes(status);
  const isInTransit = ["in_transit", "out_for_delivery", "picked_up"].includes(status);
  const isAtTerminal = ["at_terminal", "at_yard"].includes(status);
  const isBooked = status === "booked" || status === "dispatched";

  const stops: TrackingStop[] = [];

  // Pickup stop (from origin)
  const originParsed = parseLocation(load.origin as string);
  if (originParsed) {
    stops.push({
      id: "pickup",
      stopNumber: 1,
      type: "pickup",
      locationName: originParsed.name,
      locationAddress: originParsed.address,
      arrivalTime: load.pickup_time as string | undefined,
      isCompleted: isInTransit || isDelivered,
      isActive: isAtTerminal,
    });
  }

  // Delivery stop (from destination)
  const destParsed = parseLocation(load.destination as string);
  if (destParsed) {
    stops.push({
      id: "delivery",
      stopNumber: stops.length + 1,
      type: "deliver",
      locationName: destParsed.name,
      locationAddress: destParsed.address,
      arrivalTime: isDelivered
        ? (load.delivery_time as string) || (load.updated_at as string)
        : undefined,
      isCompleted: isDelivered,
      isActive: status === "out_for_delivery",
    });
  }

  // Return stop (from return_location)
  const returnParsed = parseLocation(load.return_location as string);
  if (returnParsed) {
    stops.push({
      id: "return",
      stopNumber: stops.length + 1,
      type: "return",
      locationName: returnParsed.name,
      locationAddress: returnParsed.address,
      isCompleted: status === "completed",
      isActive: false,
    });
  }

  // If no location data, create placeholder stops based on current_location or status
  if (stops.length === 0) {
    const currentLoc = load.current_location as string;

    // Pickup placeholder
    stops.push({
      id: "pickup",
      stopNumber: 1,
      type: "terminal",
      locationName: currentLoc || "Terminal Pickup",
      locationAddress: "Awaiting location details",
      isCompleted: isInTransit || isDelivered,
      isActive: isAtTerminal || isBooked,
    });

    // Delivery placeholder
    stops.push({
      id: "delivery",
      stopNumber: 2,
      type: "deliver",
      locationName: "Delivery Location",
      locationAddress: "Pending from dispatch",
      isCompleted: isDelivered,
      isActive: status === "out_for_delivery",
    });
  }

  return [
    {
      id: "move-1",
      moveNumber: 1,
      driverName:
        (load.assigned_driver_name as string) ||
        (load.driver_name as string) ||
        "Pending Assignment",
      status: isDelivered ? "completed" : isInTransit ? "in_progress" : "pending",
      totalDistance: load.total_miles as number | undefined,
      stops,
    },
  ];
}
