import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Environment tracking
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring - 10% sample rate
  tracesSampleRate: 0.1,

  // Before sending
  beforeSend(event) {
    if (process.env.NODE_ENV !== "production") {
      return null;
    }
    return event;
  },
});
