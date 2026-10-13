"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Re-fetch server-rendered data after an authorized load update. */
export function LiveRefresh({ organizationId }: { organizationId?: string }) {
  const router = useRouter();
  useEffect(() => {
    const db = createClient();
    let pending: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(pending);
      pending = setTimeout(() => router.refresh(), 300);
    };
    const channel = db.channel(`loads-refresh-${organizationId || "staff"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "loads",
        ...(organizationId ? { filter: `organization_id=eq.${organizationId}` } : {}) }, refresh)
      .subscribe();
    // Also recovers from a missed event or a temporarily disconnected socket.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 60000);
    return () => { clearTimeout(pending); clearInterval(interval); void db.removeChannel(channel); };
  }, [organizationId, router]);
  return null;
}
