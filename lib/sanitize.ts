import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize a string to prevent XSS attacks
 * Strips all HTML tags and dangerous content
 */
export function sanitizeString(input: string | undefined | null): string {
  if (!input) return "";

  // First, use DOMPurify to remove any HTML/script content
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
  });

  // Additional cleanup: trim whitespace and limit length
  return sanitized.trim();
}

/**
 * Sanitize an object's string values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };

  for (const key in result) {
    const value = result[key];

    if (typeof value === "string") {
      (result as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }

  return result;
}

/**
 * Validate and sanitize container number format
 * Format: 4 letters + 7 digits (e.g., MSCU1234567)
 */
export function sanitizeContainerNumber(input: string): string {
  const sanitized = sanitizeString(input).toUpperCase();
  // Remove any characters that aren't alphanumeric
  return sanitized.replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

/**
 * Validate and sanitize ZIP code
 * Format: 5 digits or 5+4 digits
 */
export function sanitizeZipCode(input: string): string {
  const sanitized = sanitizeString(input);
  // Keep only digits and hyphens, limit to ZIP+4 format
  return sanitized.replace(/[^\d-]/g, "").slice(0, 10);
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(input: string): string {
  const sanitized = sanitizeString(input).toLowerCase();
  // Basic email character filter
  return sanitized.replace(/[^a-z0-9@._+-]/g, "").slice(0, 254);
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(input: string): string {
  const sanitized = sanitizeString(input);
  // Keep only digits, parentheses, hyphens, spaces, and plus
  return sanitized.replace(/[^\d\s()+-]/g, "").slice(0, 20);
}

/**
 * Limit string length for free-text fields
 */
export function limitLength(input: string, maxLength: number): string {
  const sanitized = sanitizeString(input);
  return sanitized.slice(0, maxLength);
}

/**
 * Input length limits for different field types
 */
export const INPUT_LIMITS = {
  containerNumber: 11,
  terminal: 100,
  deliveryZip: 10,
  containerType: 20,
  lfd: 10,
  notes: 1000,
  name: 100,
  email: 254,
  phone: 20,
  message: 2000,
  subject: 200,
  company: 200,
} as const;
