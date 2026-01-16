"use client";

import { useState } from "react";
import {
  MapPin,
  Clock,
  Truck,
  Package,
  ArrowRight,
  User,
  Navigation,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Timer,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types for tracking data
interface TrackingStop {
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

interface TrackingMove {
  id: string;
  moveNumber: number;
  driverName: string;
  driverAvatar?: string;
  driverId?: string;
  status: "completed" | "in_progress" | "pending";
  totalDistance?: number;
  stops: TrackingStop[];
}

interface TrackingTimelineProps {
  moves: TrackingMove[];
  className?: string;
}

// Helper to format time
function formatTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper to format duration
function formatDuration(minutes?: number): string {
  if (!minutes && minutes !== 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  return `${hours}hr ${mins.toString().padStart(2, "0")}min`;
}

// Get stop type label and color
function getStopTypeInfo(type: TrackingStop["type"]) {
  const config: Record<TrackingStop["type"], { label: string; color: string; icon: React.ElementType }> = {
    pickup: { label: "Pick Up Container", color: "text-green-500", icon: Package },
    hook: { label: "Hook Container", color: "text-blue-500", icon: Truck },
    drop: { label: "Drop Container", color: "text-orange-500", icon: Package },
    deliver: { label: "Deliver Container", color: "text-purple-500", icon: MapPin },
    return: { label: "Return Container", color: "text-red-500", icon: ArrowRight },
    yard: { label: "Yard Stop", color: "text-yellow-500", icon: Package },
    terminal: { label: "Terminal", color: "text-cyan-500", icon: MapPin },
  };
  return config[type] || { label: type, color: "text-muted-foreground", icon: Circle };
}

// Individual stop component
function StopCard({ stop, isFirst, isLast, showConnector }: {
  stop: TrackingStop;
  isFirst: boolean;
  isLast: boolean;
  showConnector: boolean;
}) {
  const { label, color, icon: Icon } = getStopTypeInfo(stop.type);

  return (
    <div className="relative">
      {/* Connector line */}
      {showConnector && !isLast && (
        <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gradient-to-b from-border to-transparent" />
      )}

      <div className={cn(
        "relative flex gap-4 pb-6",
        isLast && "pb-0"
      )}>
        {/* Stop indicator */}
        <div className="flex flex-col items-center z-10">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
            stop.isCompleted
              ? "bg-green-500/10 text-green-500 ring-2 ring-green-500/20"
              : stop.isActive
                ? "bg-primary/10 text-primary ring-2 ring-primary/30 animate-pulse"
                : "bg-muted text-muted-foreground"
          )}>
            {stop.stopNumber}
          </div>
          {/* Distance indicator between stops */}
          {!isLast && stop.distanceMiles && (
            <div className="flex flex-col items-center mt-2 text-xs text-muted-foreground">
              <Route className="h-3 w-3 mb-1" />
              <span>{stop.distanceMiles.toFixed(2)} mi</span>
            </div>
          )}
        </div>

        {/* Stop details */}
        <div className="flex-1 min-w-0">
          {/* Stop type label */}
          <div className={cn("flex items-center gap-2 text-sm font-medium", color)}>
            <Icon className="h-4 w-4" />
            {label}
            {stop.isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
          </div>

          {/* Location */}
          <h4 className="font-semibold text-foreground mt-1 truncate">
            {stop.locationName}
          </h4>
          {stop.locationAddress && (
            <p className="text-sm text-muted-foreground truncate">
              {stop.locationAddress}
            </p>
          )}

          {/* Times grid */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            {/* Start/Arrival */}
            {isFirst && stop.startTime && (
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-muted-foreground mb-0.5">Start</div>
                <div className="font-medium">{formatTime(stop.startTime)}</div>
              </div>
            )}

            {/* Arrival */}
            <div className="bg-muted/50 rounded-lg p-2">
              <div className="text-muted-foreground mb-0.5">Arrival</div>
              <div className="font-medium">{formatTime(stop.arrivalTime)}</div>
            </div>

            {/* Duration at stop */}
            {stop.durationMinutes !== undefined && (
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Duration
                </div>
                <div className="font-medium">{formatDuration(stop.durationMinutes)}</div>
              </div>
            )}

            {/* Departure */}
            {stop.departureTime && (
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="text-muted-foreground mb-0.5">Departure</div>
                <div className="font-medium">{formatTime(stop.departureTime)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Move card component (contains multiple stops)
function MoveCard({ move, defaultExpanded = false }: { move: TrackingMove; defaultExpanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isCompleted = move.status === "completed";
  const isActive = move.status === "in_progress";

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-all",
      isActive && "ring-2 ring-primary/30",
      isCompleted && "opacity-90"
    )}>
      {/* Move header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
      >
        {/* Move number badge */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
          isCompleted
            ? "bg-green-500/10 text-green-500"
            : isActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        )}>
          {move.moveNumber}
        </div>

        {/* Move title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Container Move {move.moveNumber}
            </span>
            {isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">
                Completed
              </span>
            )}
            {isActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium animate-pulse">
                In Progress
              </span>
            )}
          </div>

          {/* Driver info */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {move.driverAvatar ? (
                <img
                  src={move.driverAvatar}
                  alt={move.driverName}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <User className="h-3 w-3 text-primary" />
              )}
            </div>
            <span className="font-medium text-sm truncate">{move.driverName}</span>
          </div>
        </div>

        {/* Distance & expand */}
        <div className="flex items-center gap-3 shrink-0">
          {move.totalDistance && (
            <div className="text-right text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                <span>{move.totalDistance.toFixed(2)} mi</span>
              </div>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Stops list (expandable) */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t bg-muted/30">
          <div className="space-y-0">
            {move.stops.map((stop, idx) => (
              <StopCard
                key={stop.id}
                stop={stop}
                isFirst={idx === 0}
                isLast={idx === move.stops.length - 1}
                showConnector={move.stops.length > 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main tracking timeline component
export function TrackingTimeline({ moves, className }: TrackingTimelineProps) {
  if (moves.length === 0) {
    return (
      <div className="text-center py-8">
        <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">No tracking data available yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Tracking updates will appear here once the container is dispatched
        </p>
      </div>
    );
  }

  // Calculate totals
  const totalDistance = moves.reduce((sum, m) => sum + (m.totalDistance || 0), 0);
  const completedMoves = moves.filter(m => m.status === "completed").length;
  const totalStops = moves.reduce((sum, m) => sum + m.stops.length, 0);
  const completedStops = moves.reduce(
    (sum, m) => sum + m.stops.filter(s => s.isCompleted).length,
    0
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-foreground">{moves.length}</div>
          <div className="text-xs text-muted-foreground">Moves</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-foreground">{totalStops}</div>
          <div className="text-xs text-muted-foreground">Stops</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-foreground">{totalDistance.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Miles</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-500">{completedStops}/{totalStops}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-primary rounded-full transition-all duration-500"
          style={{ width: `${(completedStops / totalStops) * 100}%` }}
        />
      </div>

      {/* Moves list */}
      <div className="space-y-3">
        {moves.map((move, idx) => (
          <MoveCard
            key={move.id}
            move={move}
            defaultExpanded={move.status === "in_progress" || idx === moves.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

// Export types for external use
export type { TrackingMove, TrackingStop };
