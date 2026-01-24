"use client";

import { useEffect } from "react";
import { setUserContext } from "@/lib/sentry";
import { createClient } from "@/lib/supabase/client";

/**
 * Syncs Supabase auth state with Sentry user context.
 * Mount this component once in the root layout.
 */
export function SentryUserContext() {
  useEffect(() => {
    const supabase = createClient();

    // Set initial user context
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserContext({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        setUserContext(null);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserContext({
          id: session.user.id,
          email: session.user.email,
        });
      } else {
        setUserContext(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
