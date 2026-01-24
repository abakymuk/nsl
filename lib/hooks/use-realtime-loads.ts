"use client";

/**
 * Real-time Loads Hook
 * Subscribes to Supabase Realtime for live load and event updates
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Load, LoadEvent } from "@/types/database";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeLoadsOptions {
  /** Subscribe to a single load by ID */
  loadId?: string;
  /** Filter by status for list subscriptions */
  statusFilter?: string;
  /** Callback when a load is updated */
  onLoadUpdate?: (load: Partial<Load> & { id: string }) => void;
  /** Callback when a new event is added */
  onEventInsert?: (event: LoadEvent) => void;
  /** Callback for connection status changes */
  onConnectionChange?: (connected: boolean) => void;
}

interface RealtimeState {
  isConnected: boolean;
  lastUpdate: string | null;
  error: string | null;
}

export function useRealtimeLoads(options: UseRealtimeLoadsOptions = {}) {
  const {
    loadId,
    statusFilter,
    onLoadUpdate,
    onEventInsert,
    onConnectionChange,
  } = options;

  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    lastUpdate: null,
    error: null,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);

  const handleLoadChange = useCallback(
    (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const eventType = payload.eventType;
      const newRecord = payload.new as Partial<Load> & { id: string };
      const oldRecord = payload.old as Partial<Load>;

      console.log(`Realtime: Load ${eventType}`, newRecord?.id || oldRecord?.id);

      setState((prev) => ({
        ...prev,
        lastUpdate: new Date().toISOString(),
      }));

      if (onLoadUpdate && newRecord) {
        onLoadUpdate(newRecord);
      }
    },
    [onLoadUpdate]
  );

  const handleEventInsert = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const newEvent = payload.new as LoadEvent;

      console.log(`Realtime: Event inserted for load ${newEvent.load_id}`);

      setState((prev) => ({
        ...prev,
        lastUpdate: new Date().toISOString(),
      }));

      if (onEventInsert && newEvent) {
        onEventInsert(newEvent);
      }
    },
    [onEventInsert]
  );

  useEffect(() => {
    const supabase = createClient();

    // Build channel name
    const channelName = loadId
      ? `realtime-load-${loadId}`
      : `realtime-loads-${statusFilter || "all"}`;

    // Create channel
    const channel = supabase.channel(channelName);

    // Subscribe to loads table changes
    const loadsFilter = loadId ? `id=eq.${loadId}` : undefined;
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "loads",
        filter: loadsFilter,
      },
      handleLoadChange
    );

    // Subscribe to load_events table for new events
    const eventsFilter = loadId ? `load_id=eq.${loadId}` : undefined;
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "load_events",
        filter: eventsFilter,
      },
      handleEventInsert
    );

    // Subscribe to channel
    channel.subscribe((status) => {
      const isConnected = status === "SUBSCRIBED";

      console.log(`Realtime: Channel ${channelName} status: ${status}`);

      setState((prev) => ({
        ...prev,
        isConnected,
        error: status === "CHANNEL_ERROR" ? "Connection error" : null,
      }));

      if (onConnectionChange) {
        onConnectionChange(isConnected);
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log(`Realtime: Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [
    loadId,
    statusFilter,
    handleLoadChange,
    handleEventInsert,
    onConnectionChange,
  ]);

  // Manual refresh function (forces re-fetch from database)
  const refresh = useCallback(() => {
    setState((prev) => ({
      ...prev,
      lastUpdate: new Date().toISOString(),
    }));
  }, []);

  return {
    isConnected: state.isConnected,
    lastUpdate: state.lastUpdate,
    error: state.error,
    refresh,
  };
}

/**
 * Hook for subscribing to sync status updates (admin dashboard)
 */
export function useRealtimeSyncStatus(
  onStatusUpdate?: (status: unknown) => void
) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("realtime-sync-status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sync_status",
        },
        (payload) => {
          console.log("Realtime: Sync status update", payload);
          if (onStatusUpdate) {
            onStatusUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onStatusUpdate]);

  return { isConnected };
}
