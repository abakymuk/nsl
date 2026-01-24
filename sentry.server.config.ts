import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Environment and release tracking
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring - 10% sample rate
  tracesSampleRate: 0.1,

  // Enable structured logging
  _experiments: {
    enableLogs: true,
  },

  integrations: [
    // Console logging integration for server-side
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
  ],

  // Before sending, ensure we're not leaking sensitive data
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      console.log("[Sentry] Server event captured (dev mode, not sent):", event.message);
      return null;
    }

    // Scrub sensitive headers
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-api-key"];
    }

    return event;
  },
});
