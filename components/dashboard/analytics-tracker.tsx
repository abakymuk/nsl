"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@/lib/analytics";

interface AnalyticsTrackerProps {
  section: string;
  quoteCount?: number;
}

/**
 * Client component that tracks dashboard section views.
 * Mount this in server components to track analytics.
 */
export function DashboardAnalyticsTracker({ section, quoteCount }: AnalyticsTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Track dashboard section view
    Analytics.dashboardViewed(section);

    // If quote count is provided, track it
    if (typeof quoteCount === "number") {
      Analytics.dashboardQuotesViewed(quoteCount);
    }
  }, [section, quoteCount, pathname]);

  return null;
}
