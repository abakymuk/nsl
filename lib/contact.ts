/**
 * Contact Information Constants
 *
 * Centralized contact info to avoid hardcoding across the codebase.
 * For email addresses used in API routes, prefer environment variables
 * with these as fallbacks.
 */

export const CONTACT = {
  // Phone numbers
  PHONE: "(929) 394-0049",
  PHONE_TOLL_FREE: "(888) 533-0302",
  PHONE_TEL: "+1-888-533-0302", // For tel: links and structured data

  // Email addresses
  EMAIL_INFO: "info@newstreamlogistics.com",
  EMAIL_NOREPLY: "noreply@newstreamlogistics.com",
  EMAIL_QUOTES: "quotes@newstreamlogistics.com",
  EMAIL_CONTACT: "contact@newstreamlogistics.com",
  EMAIL_DISPATCHER: "dispatcher@newstreamlogistics.com",

  // Website
  SITE_URL: "https://newstreamlogistics.com",
} as const;

/**
 * Get site URL from environment or fallback to constant
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || CONTACT.SITE_URL;
}

/**
 * Get email "from" address from environment or fallback
 */
export function getEmailFrom(type: "noreply" | "quotes" | "contact" = "noreply"): string {
  const envFrom = process.env.EMAIL_FROM;
  if (envFrom) return envFrom;

  switch (type) {
    case "quotes":
      return CONTACT.EMAIL_QUOTES;
    case "contact":
      return CONTACT.EMAIL_CONTACT;
    default:
      return CONTACT.EMAIL_NOREPLY;
  }
}

/**
 * Get email "to" address from environment or fallback
 */
export function getEmailTo(): string {
  return process.env.EMAIL_TO || CONTACT.EMAIL_INFO;
}
