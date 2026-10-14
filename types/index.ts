// Re-export Zod-inferred types for forms
export type { QuoteFormInput, QuoteFormOutput } from "@/lib/validations/quote";

// Request types for the quote form
export type RequestType =
  | "standard"
  | "urgent_lfd"
  | "rolled"
  | "hold_released"
  | "customs_check"
  | "not_sure";

export type DeliveryType = "business" | "warehouse" | "residential" | "other";
export type PortType = "la" | "lb";

// New QuoteFormData with conversion-optimized flow
export interface QuoteFormData {
  // Step 1: Contact & Request (all required except email)
  fullName: string;
  companyName: string;
  phone: string; // Now required
  email?: string; // Now optional
  port: PortType;
  requestType: RequestType;
  timeSensitive?: boolean;

  // Step 2: Container & Pickup (all optional)
  containerNumber?: string; // Now optional
  terminal?: string;
  lfd?: string;
  availabilityDate?: string;
  notes?: string;

  // Step 3: Delivery (ZIP required)
  deliveryZip: string;
  deliveryType?: DeliveryType;
  appointmentRequired?: boolean;

  // Legacy fields (kept for compatibility)
  containerType?: string;
  moveType?: "import" | "export";
  commodityType?: string;
}
