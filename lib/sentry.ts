/**
 * Sentry Utility Functions
 *
 * Provides consistent error capture and logging across the application.
 * In development, logs to console instead of sending to Sentry.
 */

import * as Sentry from "@sentry/nextjs";

const { logger } = Sentry;

type ErrorContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string };
  level?: Sentry.SeverityLevel;
};

/**
 * Capture an exception with context
 */
export function captureError(error: unknown, context?: ErrorContext): void {
  const err = error instanceof Error ? error : new Error(String(error));

  if (process.env.NODE_ENV !== "production") {
    console.error("[Sentry]", err.message, context);
    return;
  }

  Sentry.captureException(err, {
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
    level: context?.level || "error",
  });
}

/**
 * Capture a message with context
 */
export function captureMessage(
  message: string,
  context?: ErrorContext
): void {
  if (process.env.NODE_ENV !== "production") {
    console.log("[Sentry]", message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level: context?.level || "info",
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Capture DLQ (Dead Letter Queue) errors with webhook context
 */
export function captureDLQError(
  eventType: string,
  payload: string,
  errorMessage: string
): void {
  captureError(new Error(`DLQ: ${errorMessage}`), {
    tags: {
      source: "portpro-webhook",
      event_type: eventType,
    },
    extra: {
      payload: payload.slice(0, 2000), // Truncate large payloads
    },
    level: "warning",
  });
}

/**
 * Capture webhook processing errors
 */
export function captureWebhookError(
  eventType: string,
  error: unknown,
  referenceNumber?: string
): void {
  captureError(error, {
    tags: {
      source: "portpro-webhook",
      event_type: eventType,
      ...(referenceNumber && { reference_number: referenceNumber }),
    },
  });
}

/**
 * Capture API route errors with request context
 */
export function captureAPIError(
  route: string,
  method: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  captureError(error, {
    tags: {
      source: "api-route",
      route,
      method,
    },
    extra,
  });
}

/**
 * Set authenticated user context for Sentry
 */
export function setUserContext(user: { id: string; email?: string } | null): void {
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}

/**
 * Structured logging utilities
 * Use these instead of console.log/warn/error in production code
 */
export const log = {
  trace: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[trace]", message, data);
      return;
    }
    logger.trace(message, data);
  },

  debug: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[debug]", message, data);
      return;
    }
    logger.debug(message, data);
  },

  info: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.log("[info]", message, data);
      return;
    }
    logger.info(message, data);
  },

  warn: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[warn]", message, data);
      return;
    }
    logger.warn(message, data);
  },

  error: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[error]", message, data);
      return;
    }
    logger.error(message, data);
  },

  fatal: (message: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[fatal]", message, data);
      return;
    }
    logger.fatal(message, data);
  },
};

/**
 * Wrap an async function with Sentry span for performance tracking
 */
export async function withSpan<T>(
  op: string,
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return Sentry.startSpan(
    { op, name },
    async (span) => {
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }
      return fn();
    }
  );
}
