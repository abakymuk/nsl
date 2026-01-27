/**
 * Test fixtures for quotes
 */

export const mockQuote = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  reference_number: "NSL-20260126-1234",
  status: "pending",
  lifecycle_status: "pending",
  created_at: "2026-01-26T10:00:00Z",
  updated_at: "2026-01-26T10:00:00Z",

  // Contact info
  full_name: "John Doe",
  company_name: "Acme Corp",
  email: "john@acme.com",
  phone: "5551234567",

  // Container details
  container_number: "MSCU1234567",
  container_type: "40HC",
  weight_lbs: 40000,
  is_hazmat: false,
  is_overweight: false,

  // Locations
  pickup_terminal: "APM",
  delivery_zip: "90210",
  delivery_city: "Beverly Hills",
  delivery_state: "CA",

  // Lead scoring
  lead_score: 3,
  is_urgent: false,
  request_type: "standard",
};

export const mockUrgentQuote = {
  ...mockQuote,
  id: "550e8400-e29b-41d4-a716-446655440001",
  reference_number: "NSL-20260126-5678",
  request_type: "urgent_lfd",
  lead_score: 5,
  is_urgent: true,
  lfd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
};

export const mockQuotedQuote = {
  ...mockQuote,
  id: "550e8400-e29b-41d4-a716-446655440002",
  status: "quoted",
  lifecycle_status: "quoted",
  quoted_price: 850.0,
  quoted_at: "2026-01-26T12:00:00Z",
  quote_valid_until: "2026-02-02",
};

export const mockAcceptedQuote = {
  ...mockQuotedQuote,
  id: "550e8400-e29b-41d4-a716-446655440003",
  status: "accepted",
  lifecycle_status: "accepted",
  accepted_at: "2026-01-26T14:00:00Z",
};

export const mockQuoteFormData = {
  // Step 1: Contact
  fullName: "John Doe",
  companyName: "Acme Corp",
  email: "john@acme.com",
  phone: "5551234567",

  // Step 2: Container
  containerNumber: "MSCU1234567",
  containerType: "40HC",
  pickupTerminal: "APM",
  port: "LA",
  weightLbs: 40000,
  isHazmat: false,
  isOverweight: false,
  requestType: "standard",

  // Step 3: Delivery
  deliveryZip: "90210",
  deliveryCity: "Beverly Hills",
  deliveryState: "CA",
  specialInstructions: "",
};

export const mockInvalidQuoteFormData = {
  fullName: "J", // Too short
  companyName: "",
  email: "invalid-email",
  phone: "123", // Too short
  containerNumber: "",
  containerType: "",
  pickupTerminal: "",
  deliveryZip: "123", // Invalid format
};
