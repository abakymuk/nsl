"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, Suspense, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import mixpanel from "mixpanel-browser";
import type { MixpanelUserProperties, MixpanelEventProperties } from "./types";

interface MixpanelContextType {
  track: (event: string, properties?: MixpanelEventProperties) => void;
  identify: (userId: string, properties?: MixpanelUserProperties) => void;
  reset: () => void;
  isReady: boolean;
}

const MixpanelContext = createContext<MixpanelContextType | null>(null);

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Separate component for page view tracking (uses useSearchParams)
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;

    // Avoid duplicate tracking for same path
    const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    if (fullPath === lastTrackedPath.current) return;
    lastTrackedPath.current = fullPath;

    // Don't track admin pages
    if (pathname.startsWith("/admin")) return;

    // Extract UTM parameters
    const utmParams: Record<string, string> = {};
    if (searchParams) {
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((param) => {
        const value = searchParams.get(param);
        if (value) utmParams[param] = value;
      });
    }

    const properties = {
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      ...utmParams,
    };

    if (IS_PRODUCTION) {
      try {
        mixpanel.track("page_view", properties);
      } catch {
        // Mixpanel not initialized yet
      }
    } else {
      console.log("[Mixpanel] page_view:", properties);
    }
  }, [pathname, searchParams]);

  return null;
}

export function MixpanelProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const initAttempted = useRef(false);

  // Initialize Mixpanel
  useEffect(() => {
    if (!MIXPANEL_TOKEN || initAttempted.current) return;
    initAttempted.current = true;

    try {
      mixpanel.init(MIXPANEL_TOKEN, {
        debug: !IS_PRODUCTION,
        track_pageview: false, // We handle this manually
        persistence: "localStorage",
        ignore_dnt: false,
        batch_requests: true,
        api_host: "https://api.mixpanel.com",
      });

      // Register super properties (included with every event)
      mixpanel.register({
        app_version: "2.0",
        platform: "web",
      });

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true);

      if (!IS_PRODUCTION) {
        console.log("[Mixpanel] Initialized");
      }
    } catch (error) {
      console.error("[Mixpanel] Init error:", error);
    }
  }, []);

  const track = useCallback((event: string, properties?: MixpanelEventProperties) => {
    const enrichedProperties = {
      ...properties,
      path: pathname,
      timestamp: new Date().toISOString(),
    };

    if (IS_PRODUCTION) {
      try {
        mixpanel.track(event, enrichedProperties);
      } catch {
        // Not initialized yet
      }
    } else {
      console.log(`[Mixpanel] ${event}:`, enrichedProperties);
    }
  }, [pathname]);

  const identify = useCallback((userId: string, properties?: MixpanelUserProperties) => {
    if (IS_PRODUCTION) {
      try {
        mixpanel.identify(userId);
        if (properties) {
          mixpanel.people.set(properties);
        }
      } catch {
        // Not initialized yet
      }
    } else {
      console.log("[Mixpanel] identify:", userId, properties);
    }
  }, []);

  const reset = useCallback(() => {
    if (IS_PRODUCTION) {
      try {
        mixpanel.reset();
      } catch {
        // Not initialized yet
      }
    } else {
      console.log("[Mixpanel] reset");
    }
  }, []);

  return (
    <MixpanelContext.Provider
      value={{
        track,
        identify,
        reset,
        isReady,
      }}
    >
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </MixpanelContext.Provider>
  );
}

export function useMixpanel() {
  const context = useContext(MixpanelContext);
  if (!context) {
    // Return no-op functions if used outside provider
    return {
      track: () => {},
      identify: () => {},
      reset: () => {},
      isReady: false,
    };
  }
  return context;
}
