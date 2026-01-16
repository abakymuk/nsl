// Re-export Zod-inferred types for forms
export type { QuoteFormInput, QuoteFormOutput } from "@/lib/validations/quote";
export type { ContactFormInput, ContactFormOutput } from "@/lib/validations/contact";

// Legacy type aliases for backwards compatibility
export interface QuoteFormData {
  containerNumber: string;
  terminal: string;
  deliveryZip: string;
  containerType: string;
  lfd?: string;
  notes?: string;
  // New fields
  moveType: "import" | "export";
  commodityType?: string;
  // Contact info for early capture
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
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
