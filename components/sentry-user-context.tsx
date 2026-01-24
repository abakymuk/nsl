"use client";

import { useEffect } from "react";
import { setUserContext } from "@/lib/sentry";
import { useMixpanel } from "@/lib/mixpanel";
import { createClient } from "@/lib/supabase/client";

/**
 * Syncs Supabase auth state with Sentry and Mixpanel user context.
 * Mount this component once in the root layout.
 */
export function SentryUserContext() {
  const { identify, reset } = useMixpanel();

  useEffect(() => {
    const supabase = createClient();

    // Set initial user context
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Sentry
        setUserContext({
          id: session.user.id,
          email: session.user.email,
        });
        // Mixpanel
        identify(session.user.id, {
          $email: session.user.email,
          $name: session.user.user_metadata?.full_name,
        });
      } else {
        setUserContext(null);
        reset();
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Sentry
        setUserContext({
          id: session.user.id,
          email: session.user.email,
        });
        // Mixpanel
        identify(session.user.id, {
          $email: session.user.email,
          $name: session.user.user_metadata?.full_name,
        });
      } else {
        setUserContext(null);
        reset();
      }
    });

    return () => subscription.unsubscribe();
  }, [identify, reset]);

  return null;
}
