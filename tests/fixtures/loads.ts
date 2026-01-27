/**
 * Test fixtures for loads
 */

export const mockLoad = {
  id: "660e8400-e29b-41d4-a716-446655440000",
  tracking_number: "NSLABCD1234EFGH",
  portpro_load_id: "PP-12345",
  portpro_reference: "REF-12345",
  created_at: "2026-01-26T10:00:00Z",
  updated_at: "2026-01-26T12:00:00Z",

  // Container
  container_number: "MSCU1234567",
  container_size: "40HC",
  seal_number: "SEAL123",
  chassis_number: "CHAS456",
  weight: 40000,

  // Status
  status: "in_transit",
  current_location: "Port of Los Angeles",

  // Route
  origin: "APM Terminal, Port of LA",
  destination: "123 Main St, Beverly Hills, CA 90210",
  eta: "2026-01-27T14:00:00Z",
  pickup_time: "2026-01-26T08:00:00Z",
  delivery_time: null,

  // Assignment
  driver_name: "Mike Smith",
  truck_number: "T-101",

  // Customer
  customer_name: "Acme Corp",
  customer_email: "john@acme.com",

  // Notes
  public_notes: "Handle with care",
  internal_notes: "VIP customer",
};

export const mockDeliveredLoad = {
  ...mockLoad,
  id: "660e8400-e29b-41d4-a716-446655440001",
  status: "delivered",
  delivery_time: "2026-01-27T13:30:00Z",
  current_location: "123 Main St, Beverly Hills, CA 90210",
};

export const mockLoadEvent = {
  id: "770e8400-e29b-41d4-a716-446655440000",
  load_id: mockLoad.id,
  created_at: "2026-01-26T10:00:00Z",
  status: "in_transit",
  event_type: "stop",
  stop_type: "pickup",
  move_number: 1,
  stop_number: 1,
  description: "Container picked up at APM Terminal",
  location: "APM Terminal",
  location_name: "APM Terminal",
  location_address: "2500 Navy Way, San Pedro, CA 90731",
  arrival_time: "2026-01-26T08:00:00Z",
  notes: null,
  portpro_event: true,
};

export const mockLoadEvents = [
  mockLoadEvent,
  {
    ...mockLoadEvent,
    id: "770e8400-e29b-41d4-a716-446655440001",
    status: "in_transit",
    stop_type: "deliver",
    move_number: 1,
    stop_number: 2,
    description: "En route to delivery",
    location: "I-405 Freeway",
    arrival_time: "2026-01-26T10:30:00Z",
  },
];

export const mockPortProLoad = {
  _id: "PP-12345",
  reference_number: "REF-12345",
  containerNo: "MSCU1234567",
  containerSize: { label: "40HC" },
  containerType: { label: "High Cube" },
  status: "DISPATCHED",
  pickupLocation: {
    company_name: "APM Terminal",
    address: "2500 Navy Way",
    city: "San Pedro",
    state: "CA",
    zip: "90731",
  },
  deliveryLocation: {
    company_name: "Acme Corp",
    address: "123 Main St",
    city: "Beverly Hills",
    state: "CA",
    zip: "90210",
  },
  totalAmount: 1200,
  expenses: [{ amount: 100 }],
  vendorPay: [{ totalAmount: 150 }],
  driverPay: [{ amount: 200 }],
  driverOrder: [
    {
      moves: [
        {
          type: "PULLCONTAINER",
          company_name: "APM Terminal",
          address: { city: "San Pedro", state: "CA" },
        },
        {
          type: "DELIVERLOAD",
          company_name: "Acme Corp",
          address: { city: "Beverly Hills", state: "CA" },
        },
      ],
    },
  ],
};

export const mockPortProWebhookPayload = {
  event: "load#status_updated",
  data: {
    load: mockPortProLoad,
    previousStatus: "PENDING",
    newStatus: "DISPATCHED",
  },
  timestamp: "2026-01-26T10:00:00Z",
};
