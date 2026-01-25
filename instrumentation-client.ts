import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment and release tracking
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring - 10% sample rate
  tracesSampleRate: 0.1,

  // Session replay - only on errors
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // Enable structured logging
  _experiments: {
    enableLogs: true,
  },

  integrations: [
    // Replay for error sessions (PII masked)
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    // Console logging integration - capture warnings and errors
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors that are usually user-side
    "NetworkError",
    "Failed to fetch",
    "Load failed",
    // ResizeObserver errors (benign)
    "ResizeObserver loop",
    // Supabase Auth lock timeout (benign - happens with multiple tabs/background tabs)
    "signal is aborted without reason",
    "AbortError",
  ],

  // Before sending, add extra context
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[Sentry] Event captured (dev mode, not sent):", event.message);
      return null;
    }
    return event;
  },
});

// Export for Next.js navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
