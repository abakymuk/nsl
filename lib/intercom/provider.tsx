"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import Intercom, { shutdown, update } from "@intercom/messenger-js-sdk";
import { createClient } from "@/lib/supabase/client";
import type { IntercomSettings, UserContext } from "./types";

interface IntercomProviderProps {
  children: React.ReactNode;
  appId?: string;
}

/**
 * IntercomProvider - Initializes Intercom with user context
 *
 * Features:
 * - Auto-boots Intercom with user data when authenticated
 * - Anonymous visitor support for unauthenticated users
 * - Auto-updates on route changes (SPA support)
 * - Excludes admin pages
 * - Syncs with Supabase auth state changes
 */
export function IntercomProvider({ children, appId }: IntercomProviderProps) {
  const pathname = usePathname();
  const bootedRef = useRef(false);
  const intercomAppId = appId || process.env.NEXT_PUBLIC_INTERCOM_APP_ID;

  // Skip on admin pages
  const isAdminPage = pathname?.startsWith("/admin");

  // Fetch user context from API
  const fetchUserContext = useCallback(async (): Promise<UserContext | null> => {
    try {
      const res = await fetch("/api/auth/permissions");
      if (!res.ok) return null;
      const data = await res.json();

      if (!data.userId) return null;

      return {
        userId: data.userId,
        email: data.email,
        fullName: data.profile?.full_name,
        createdAt: data.profile?.created_at,
        organizationId: data.organization?.id,
        organizationName: data.organization?.name,
      };
    } catch {
      return null;
    }
  }, []);

  // Boot Intercom with settings
  const bootIntercom = useCallback(
    async (forceAnonymous = false) => {
      if (!intercomAppId || isAdminPage) return;

      const userContext = forceAnonymous ? null : await fetchUserContext();

      const settings: IntercomSettings = {
        app_id: intercomAppId,
        hide_default_launcher: true, // We use custom launcher
      };

      // Add user data if authenticated
      if (userContext?.userId) {
        settings.user_id = userContext.userId;
        settings.email = userContext.email;
        settings.name = userContext.fullName;

        if (userContext.createdAt) {
          settings.created_at = Math.floor(
            new Date(userContext.createdAt).getTime() / 1000
          );
        }

        // Add company data
        if (userContext.organizationId && userContext.organizationName) {
          settings.company = {
            company_id: userContext.organizationId,
            name: userContext.organizationName,
          };
        }
      }

      Intercom(settings);
      bootedRef.current = true;
    },
    [intercomAppId, isAdminPage, fetchUserContext]
  );

  // Initial boot
  useEffect(() => {
    if (!intercomAppId || isAdminPage) return;

    bootIntercom();

    return () => {
      if (bootedRef.current) {
        shutdown();
        bootedRef.current = false;
      }
    };
  }, [intercomAppId, isAdminPage, bootIntercom]);

  // Listen for auth state changes
  useEffect(() => {
    if (!intercomAppId || isAdminPage) return;

    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        // Re-boot with user data
        bootIntercom();
      } else if (event === "SIGNED_OUT") {
        // Shutdown and re-boot as anonymous
        if (bootedRef.current) {
          shutdown();
          bootedRef.current = false;
        }
        bootIntercom(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [intercomAppId, isAdminPage, bootIntercom]);

  // Update on route changes
  useEffect(() => {
    if (!isAdminPage && bootedRef.current && intercomAppId) {
      try {
        update({ app_id: intercomAppId });
      } catch {
        // Intercom not ready
      }
    }
  }, [pathname, isAdminPage, intercomAppId]);

  return <>{children}</>;
}
