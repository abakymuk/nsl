import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Package,
  Calendar,
  User,
  Mail,
  Phone,
  Ship,
  FileText,
  Truck,
  Scale,
  RotateCcw,
  Navigation,
} from "lucide-react";
import { LoadActions } from "./load-actions";
import { LoadTimeline } from "./load-timeline";
import { TrackingTimeline, type TrackingMove, type TrackingStop } from "./tracking-timeline";

// Helper to parse container size/type that might be stored as JSON string
function parseContainerField(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    // Check if it's a JSON string
    if (value.startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        return parsed.label || parsed.name || null;
      } catch {
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

// Convert load events to tracking moves format
function convertEventsToTrackingMoves(
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
  const stopEvents = sortedEvents.filter(e => e.event_type === "stop");
  const moveStartEvents = sortedEvents.filter(e => e.event_type === "move_start");

  if (stopEvents.length === 0 && moveStartEvents.length === 0) {
    // If no detailed tracking events, create a basic tracking view from load data
    return createBasicTrackingFromLoad(load);
  }

  // Group stops by move number
  const moveGroups = new Map<number, Array<Record<string, unknown>>>();
  stopEvents.forEach(event => {
    const moveNum = (event.move_number as number) || 1;
    if (!moveGroups.has(moveNum)) {
      moveGroups.set(moveNum, []);
    }
    moveGroups.get(moveNum)!.push(event);
  });

  // Get move_start metadata (driver info, total distance) indexed by move number
  const moveStartMap = new Map<number, Record<string, unknown>>();
  moveStartEvents.forEach(event => {
    const moveNum = (event.move_number as number) || 1;
    moveStartMap.set(moveNum, event);
  });

  // Convert to TrackingMove format
  const moves: TrackingMove[] = [];

  // Process all move numbers from either stops or move_starts
  const allMoveNumbers = new Set([...moveGroups.keys(), ...moveStartMap.keys()]);

  allMoveNumbers.forEach(moveNumber => {
    const groupStops = moveGroups.get(moveNumber) || [];
    const moveStartEvent = moveStartMap.get(moveNumber);

    // Sort stops by stop_number
    const sortedStops = [...groupStops].sort(
      (a, b) => ((a.stop_number as number) || 0) - ((b.stop_number as number) || 0)
    );

    const stops: TrackingStop[] = sortedStops.map((event, idx) => {
      const isCompleted = event.status === "completed" || !!(event.departure_time);
      const isActive = event.status === "in_progress" || (!event.departure_time && !!event.arrival_time);

      return {
        id: event.id as string,
        stopNumber: (event.stop_number as number) || idx + 1,
        type: (event.stop_type as TrackingStop["type"]) || "terminal",
        locationName: (event.location_name as string) || (event.location as string) || "Unknown",
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
    if (moveStartEvent?.status === "completed" || stops.every(s => s.isCompleted)) {
      moveStatus = "completed";
    } else if (moveStartEvent?.status === "in_progress" || stops.some(s => s.isActive || s.isCompleted)) {
      moveStatus = "in_progress";
    }

    // Calculate total distance from move_start or sum of stops
    const totalDistance = (moveStartEvent?.distance_miles as number)
      || stops.reduce((sum, s) => sum + (s.distanceMiles || 0), 0)
      || undefined;

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

// Create basic tracking from load origin/destination when no detailed events exist
function createBasicTrackingFromLoad(load: Record<string, unknown>): TrackingMove[] {
  const status = load.status as string || "booked";
  const isDelivered = ["delivered", "completed"].includes(status);
  const isInTransit = ["in_transit", "out_for_delivery", "picked_up"].includes(status);
  const isAtTerminal = ["at_terminal", "at_yard"].includes(status);
  const isBooked = status === "booked" || status === "dispatched";

  const stops: TrackingStop[] = [];

  // Helper to parse location string (may have company name on first line, address on subsequent lines)
  const parseLocation = (loc: string | null | undefined): { name: string; address?: string } | null => {
    if (!loc || typeof loc !== "string") return null;
    const lines = loc.split("\n").filter(l => l.trim());
    if (lines.length === 0) return null;
    return {
      name: lines[0],
      address: lines.slice(1).join(", ") || undefined,
    };
  };

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
      arrivalTime: isDelivered ? (load.delivery_time as string) || (load.updated_at as string) : undefined,
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

  return [{
    id: "move-1",
    moveNumber: 1,
    driverName: (load.assigned_driver_name as string) || (load.driver_name as string) || "Pending Assignment",
    status: isDelivered ? "completed" : isInTransit ? "in_progress" : "pending",
    totalDistance: load.total_miles as number | undefined,
    stops,
  }];
}

// Format container size/type for display
function formatContainerInfo(size: unknown, type: unknown): string | null {
  const sizeStr = parseContainerField(size);
  const typeStr = parseContainerField(type);

  if (!sizeStr && !typeStr) return null;

  // Map common abbreviations to full names
  const typeLabels: Record<string, string> = {
    "HC": "High Cube",
    "ST": "Standard",
    "RF": "Reefer",
    "High Cube": "High Cube",
    "Standard": "Standard",
    "Reefer": "Reefer",
  };

  const formattedType = typeStr ? (typeLabels[typeStr] || typeStr) : null;

  if (sizeStr && formattedType) {
    return `${sizeStr} ${formattedType}`;
  }
  return sizeStr || formattedType;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getLoad(id: string) {
  const { data, error } = await supabase
    .from("loads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function getLoadEvents(loadId: string) {
  const { data, error } = await supabase
    .from("load_events")
    .select("*")
    .eq("load_id", loadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return data || [];
}

export default async function LoadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const load = await getLoad(id);

  if (!load) {
    notFound();
  }

  const events = await getLoadEvents(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/loads"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Loads
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono">{load.tracking_number}</h1>
          <p className="text-muted-foreground mt-1">
            Container: {load.container_number}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            load.status === "delivered"
              ? "bg-success/15 text-success"
              : load.status === "in_transit"
              ? "bg-primary/15 text-primary"
              : load.status === "at_port"
              ? "bg-chart-4/15 text-chart-4"
              : load.status === "out_for_delivery"
              ? "bg-accent/15 text-accent"
              : load.status === "cancelled"
              ? "bg-destructive/15 text-destructive"
              : "bg-warning/15 text-warning"
          }`}
        >
          {load.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route - only show if origin, destination, or return_location exists */}
          {(load.origin || load.destination || load.return_location) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Route Information</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {load.origin && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <p className="text-xs text-muted-foreground font-medium">Pick Up Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{load.origin}</p>
                  </div>
                )}
                {load.destination && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <p className="text-xs text-muted-foreground font-medium">Delivery Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{load.destination}</p>
                  </div>
                )}
                {load.return_location && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw className="h-4 w-4 text-orange-500" />
                      <p className="text-xs text-muted-foreground font-medium">Return Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{load.return_location}</p>
                  </div>
                )}
              </div>
              {load.total_miles && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>Total Distance: <strong className="text-foreground">{load.total_miles.toFixed(2)} miles</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Container & Equipment */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Container & Equipment</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Container #</p>
                  <code className="font-mono font-medium">{load.container_number}</code>
                </div>
              </div>
              {formatContainerInfo(load.container_size, load.container_type) && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Size / Type</p>
                    <p className="font-medium">
                      {formatContainerInfo(load.container_size, load.container_type)}
                    </p>
                  </div>
                </div>
              )}
              {load.chassis_number && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Chassis #</p>
                    <code className="font-mono font-medium">{load.chassis_number}</code>
                  </div>
                </div>
              )}
              {load.seal_number && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Seal #</p>
                    <code className="font-mono font-medium">{load.seal_number}</code>
                  </div>
                </div>
              )}
              {load.weight && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weight</p>
                    <p className="font-medium">{load.weight.toLocaleString()} LBS</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking & Shipping Info - only show if any field exists */}
          {(load.booking_number || load.shipping_line || load.commodity) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Booking & Shipping</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {load.booking_number && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Booking #</p>
                      <code className="font-mono font-medium">{load.booking_number}</code>
                    </div>
                  </div>
                )}
                {load.shipping_line && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Ship className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Shipping Line (SSL)</p>
                      <p className="font-medium">{load.shipping_line}</p>
                    </div>
                  </div>
                )}
                {load.commodity && (
                  <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commodity</p>
                      <p className="font-medium">{load.commodity}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Info */}
          {(load.customer_name || load.customer_email || load.customer_phone) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Customer Information</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {load.customer_name && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-medium">{load.customer_name}</p>
                    </div>
                  </div>
                )}
                {load.customer_email && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${load.customer_email}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {load.customer_email}
                      </a>
                    </div>
                  </div>
                )}
                {load.customer_phone && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a
                        href={`tel:${load.customer_phone}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {load.customer_phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Important Dates</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-medium">
                    {load.eta
                      ? new Date(load.eta).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Not set"}
                  </p>
                </div>
              </div>
              {load.last_free_day && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-orange-100 p-2 shrink-0">
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Free Day</p>
                    <p className="font-medium text-orange-600">
                      {new Date(load.last_free_day).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {load.pickup_time && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup Time</p>
                    <p className="font-medium">
                      {new Date(load.pickup_time).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Container Tracking Timeline */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Container Tracking</h2>
            <TrackingTimeline moves={convertEventsToTrackingMoves(events, load)} />
          </div>

          {/* Event Log (collapsible) */}
          <details className="rounded-xl border bg-card shadow-sm">
            <summary className="p-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <span className="font-semibold">Event Log ({events.length} events)</span>
            </summary>
            <div className="px-6 pb-6">
              <LoadTimeline events={[...events].sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )} />
            </div>
          </details>

          {/* Notes */}
          {load.notes && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Notes</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {load.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <LoadActions load={load} />
        </div>
      </div>
    </div>
  );
}
