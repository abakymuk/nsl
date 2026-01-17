// Re-export Zod-inferred types for forms
export type { QuoteFormInput, QuoteFormOutput } from "@/lib/validations/quote";
export type { ContactFormInput, ContactFormOutput } from "@/lib/validations/contact";

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

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
}

// Tracking types
export type ShipmentStatus =
  | "pending"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "exception";

export interface ContainerStatus {
  containerNumber: string;
  status: ShipmentStatus;
  lastUpdate: string;
  nextStep: string;
  contactEmail?: string;
}

export interface LoadEvent {
  id: string;
  timestamp: string;
  status: ShipmentStatus;
  location?: string;
  notes?: string;
}

export interface Shipment {
  id: string;
  containerNumber: string;
  status: ShipmentStatus;
  pickupTime?: string;
  deliveryTime?: string;
  currentLocation?: string;
  events: LoadEvent[];
  publicNotes?: string;
}

// Company/compliance types
export interface TrustBlockData {
  usdot?: string;
  mc?: string;
  scac?: string;
  insurance?: string;
  ports?: string[];
  yearsInOperation?: number;
  localYard?: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}
