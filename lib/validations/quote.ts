import { z } from "zod";

// List of valid terminals
export const VALID_TERMINALS = [
  "YTI (Yusen Terminals)",
  "PCT (Pacific Container Terminal)",
  "Pier A",
  "FMS (Fenix Marine Services)",
  "LBCT (Long Beach Container Terminal)",
  "WBCT (West Basin Container Terminal)",
  "TraPac",
  "Everport Terminal Services",
  "TTI (Total Terminals International)",
  "Shippers Transport",
  "APM Terminals",
  "ITS",
] as const;

// List of valid container types
export const VALID_CONTAINER_TYPES = [
  "20ft",
  "40ft",
  "40ft HC",
  "45ft",
] as const;

// Valid move types
export const VALID_MOVE_TYPES = ["import", "export"] as const;

// Container number regex: 4 letters + 7 digits
const containerNumberRegex = /^[A-Z]{4}\d{7}$/;

// ZIP code regex: 5 digits or 5+4 format
const zipCodeRegex = /^\d{5}(-\d{4})?$/;

// Email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone regex: US phone format (optional)
const phoneRegex = /^(\+1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

export const quoteFormSchema = z.object({
  containerNumber: z
    .string()
    .min(1, "Container number is required")
    .max(11, "Container number too long")
    .transform((val) => val.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .refine(
      (val) => containerNumberRegex.test(val),
      "Invalid container number format (e.g., MSCU1234567)"
    ),

  terminal: z
    .string()
    .min(1, "Terminal is required")
    .refine(
      (val) => VALID_TERMINALS.includes(val as typeof VALID_TERMINALS[number]),
      "Invalid terminal selection"
    ),

  deliveryZip: z
    .string()
    .min(1, "Delivery ZIP code is required")
    .max(10, "ZIP code too long")
    .refine((val) => zipCodeRegex.test(val), "Invalid ZIP code format"),

  containerType: z
    .string()
    .min(1, "Container type is required")
    .refine(
      (val) => VALID_CONTAINER_TYPES.includes(val as typeof VALID_CONTAINER_TYPES[number]),
      "Invalid container type"
    ),

  moveType: z
    .enum(VALID_MOVE_TYPES, {
      message: "Please select import or export",
    }),

  commodityType: z
    .string()
    .max(100, "Commodity type too long")
    .optional()
    .transform((val) => val?.trim() || undefined),

  lfd: z
    .string()
    .max(10, "Invalid date format")
    .optional()
    .transform((val) => val || undefined),

  notes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Contact information fields
  fullName: z
    .string()
    .min(2, "Full name is required")
    .max(100, "Name too long")
    .transform((val) => val.trim()),

  companyName: z
    .string()
    .min(2, "Company name is required")
    .max(150, "Company name too long")
    .transform((val) => val.trim()),

  email: z
    .string()
    .min(1, "Email is required")
    .max(254, "Email too long")
    .refine((val) => emailRegex.test(val), "Invalid email address"),

  phone: z
    .string()
    .max(20, "Phone number too long")
    .optional()
    .transform((val) => val?.trim() || undefined)
    .refine(
      (val) => !val || phoneRegex.test(val.replace(/\s/g, "")),
      "Invalid phone number format"
    ),
});

export type QuoteFormInput = z.input<typeof quoteFormSchema>;
export type QuoteFormOutput = z.output<typeof quoteFormSchema>;
