import { z } from "zod";

// Email regex (RFC 5322 simplified)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone regex: allows various formats
const phoneRegex = /^[\d\s()+-]{7,20}$/;

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name cannot exceed 100 characters")
    .transform((val) => val.trim()),

  email: z
    .string()
    .min(1, "Email is required")
    .max(254, "Email cannot exceed 254 characters")
    .transform((val) => val.toLowerCase().trim())
    .refine((val) => emailRegex.test(val), "Invalid email format"),

  phone: z
    .string()
    .max(20, "Phone number too long")
    .optional()
    .transform((val) => val?.trim() || undefined)
    .refine(
      (val) => !val || phoneRegex.test(val),
      "Invalid phone number format"
    ),

  company: z
    .string()
    .max(200, "Company name cannot exceed 200 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),

  subject: z
    .string()
    .max(200, "Subject cannot exceed 200 characters")
    .optional()
    .transform((val) => val?.trim() || undefined),

  message: z
    .string()
    .min(1, "Message is required")
    .max(2000, "Message cannot exceed 2000 characters")
    .transform((val) => val.trim()),
});

export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormOutput = z.output<typeof contactFormSchema>;
