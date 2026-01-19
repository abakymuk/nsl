import { z } from "zod";

// List of valid terminals (LA/LB ports - no LACT per business requirements)
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

// Request types for lead qualification
export const REQUEST_TYPES = [
  { value: "standard", label: "Standard drayage", score: 0 },
  { value: "urgent_lfd", label: "Urgent / near LFD", score: 2 },
  { value: "rolled", label: "Rolled / failed pickup", score: 1 },
  { value: "hold_released", label: "Hold just released", score: 1 },
  { value: "customs_check", label: "Customs hold / status check", score: 1 },
  { value: "not_sure", label: "Not sure (let us help)", score: 0 },
] as const;

export const VALID_REQUEST_TYPES = REQUEST_TYPES.map(r => r.value);

// Delivery types
export const DELIVERY_TYPES = [
  { value: "business", label: "Business" },
  { value: "warehouse", label: "Warehouse" },
  { value: "residential", label: "Residential" },
  { value: "other", label: "Other" },
] as const;

export const VALID_DELIVERY_TYPES = DELIVERY_TYPES.map(d => d.value);

// Ports
export const PORTS = [
  { value: "la", label: "Los Angeles (LA)" },
  { value: "lb", label: "Long Beach (LB)" },
] as const;

export const VALID_PORTS = PORTS.map(p => p.value);

// Container number regex: 4 letters + 7 digits (optional field now)
const containerNumberRegex = /^[A-Z]{4}\d{7}$/;

// ZIP code regex: 5 digits or 5+4 format
const zipCodeRegex = /^\d{5}(-\d{4})?$/;

// Email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone regex: US phone format (now required)
const phoneRegex = /^(\+1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;

export const quoteFormSchema = z.object({
  // Step 1: Contact & Request Type (required for lead capture)
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

  phone: z
    .string()
    .min(1, "Phone is required for urgent requests")
    .max(20, "Phone number too long")
    .transform((val) => val.trim())
    .refine(
      (val) => phoneRegex.test(val.replace(/\s/g, "")),
      "Invalid phone number format"
    ),

  email: z
    .string()
    .max(254, "Email too long")
    .optional()
    .transform((val) => val?.trim() || undefined)
    .refine(
      (val) => !val || emailRegex.test(val),
      "Invalid email address"
    ),

  port: z
    .string()
    .min(1, "Please select a port")
    .refine(
      (val) => VALID_PORTS.includes(val as typeof VALID_PORTS[number]),
      "Invalid port selection"
    ),

  requestType: z
    .string()
    .min(1, "Please select request type")
    .refine(
      (val) => VALID_REQUEST_TYPES.includes(val as typeof VALID_REQUEST_TYPES[number]),
      "Invalid request type"
    ),

  timeSensitive: z
    .boolean()
    .optional()
    .default(false),

  // Step 2: Container & Pickup (container now optional)
  containerNumber: z
    .string()
    .max(11, "Container number too long")
    .optional()
    .transform((val) => val?.toUpperCase().replace(/[^A-Z0-9]/g, "") || undefined)
    .refine(
      (val) => !val || containerNumberRegex.test(val),
      "Invalid container number format (e.g., MSCU1234567)"
    ),

  terminal: z
    .string()
    .optional()
    .refine(
      (val) => !val || VALID_TERMINALS.includes(val as typeof VALID_TERMINALS[number]),
      "Invalid terminal selection"
    ),

  lfd: z
    .string()
    .max(10, "Invalid date format")
    .optional()
    .transform((val) => val || undefined),

  availabilityDate: z
    .string()
    .max(10, "Invalid date format")
    .optional()
    .transform((val) => val || undefined),

  notes: z
    .string()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),

  // Step 3: Delivery Details
  deliveryZip: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim().replace(/\s+/g, '') : val),
    z.string()
      .min(1, "Delivery ZIP code is required")
      .max(10, "ZIP code too long")
      .refine((val) => zipCodeRegex.test(val), "Invalid ZIP code format (e.g., 90210 or 90210-1234)")
  ),

  deliveryType: z
    .string()
    .optional()
    .refine(
      (val) => !val || VALID_DELIVERY_TYPES.includes(val as typeof VALID_DELIVERY_TYPES[number]),
      "Invalid delivery type"
    ),

  appointmentRequired: z
    .boolean()
    .optional()
    .default(false),

  // Legacy fields (kept for compatibility, with defaults)
  containerType: z
    .string()
    .optional()
    .refine(
      (val) => !val || VALID_CONTAINER_TYPES.includes(val as typeof VALID_CONTAINER_TYPES[number]),
      "Invalid container type"
    ),

  moveType: z
    .enum(VALID_MOVE_TYPES)
    .optional()
    .default("import"),

  commodityType: z
    .string()
    .max(100, "Commodity type too long")
    .optional()
    .transform((val) => val?.trim() || undefined),
});

export type QuoteFormInput = z.input<typeof quoteFormSchema>;
export type QuoteFormOutput = z.output<typeof quoteFormSchema>;

// Lead scoring function
export function calculateLeadScore(data: QuoteFormOutput): number {
  let score = 0;

  // Request type scoring
  const requestTypeInfo = REQUEST_TYPES.find(r => r.value === data.requestType);
  if (requestTypeInfo) {
    score += requestTypeInfo.score;
  }

  // Time-sensitive flag
  if (data.timeSensitive) {
    score += 2;
  }

  // Phone provided (always +1 since now required)
  if (data.phone) {
    score += 1;
  }

  // Container number provided (shows preparedness)
  if (data.containerNumber) {
    score += 1;
  }

  // LFD provided and within 3 days
  if (data.lfd) {
    const lfdDate = new Date(data.lfd);
    const today = new Date();
    const daysUntilLfd = Math.ceil((lfdDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilLfd <= 3 && daysUntilLfd >= 0) {
      score += 2; // Near LFD urgency
    }
  }

  return score;
}

// Determine if lead is urgent
export function isUrgentLead(score: number, data: QuoteFormOutput): boolean {
  // Score >= 3 OR explicitly urgent request types
  const urgentRequestTypes = ['urgent_lfd', 'rolled', 'hold_released'];
  return score >= 3 || urgentRequestTypes.includes(data.requestType);
}
