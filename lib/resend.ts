/**
 * Unified Resend Email Client
 *
 * Singleton pattern for Resend client to avoid multiple instantiations.
 * Use getResend() instead of creating new Resend() instances.
 */

import { Resend } from "resend";

let _resend: Resend | null = null;

/**
 * Get the Resend client instance.
 * Creates a singleton instance on first call.
 *
 * @throws Error if RESEND_API_KEY is not configured
 */
export function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(apiKey);
  }
  return _resend;
}

/**
 * Check if Resend is configured (API key available).
 * Use this to gracefully skip email sending in dev/test environments.
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Get Resend client if configured, null otherwise.
 * Useful for optional email sending.
 */
export function getResendOptional(): Resend | null {
  if (!isResendConfigured()) {
    return null;
  }
  return getResend();
}
