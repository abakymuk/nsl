/**
 * PortPro TMS API Client
 * Handles authentication, API calls, and webhook processing
 */

const PORTPRO_API_URL = process.env.PORTPRO_API_URL || "https://api1.app.portpro.io/v1";

interface PortProConfig {
  accessToken: string;
  refreshToken: string;
}

// PortPro Load/Shipment statuses
export const PORTPRO_STATUS_MAP: Record<string, string> = {
  PENDING: "booked",
  "CUSTOMS HOLD": "at_port",
  "FREIGHT HOLD": "at_port",
  AVAILABLE: "at_port",
  DISPATCHED: "in_transit",
  DROPPED: "out_for_delivery",
  COMPLETED: "delivered",
  BILLING: "delivered",
  PARTIAL_PAID: "delivered",
  FULL_PAID: "delivered",
};

// PortPro Load Types
export type LoadType = "IMPORT" | "EXPORT" | "ROAD";

// PortPro Load Event Types
export type LoadEventType =
  | "load#created"
  | "load#info_updated"
  | "load#dates_updated"
  | "load#equipment_updated"
  | "load#reference_updated"
  | "load#hold_updated"
  | "load#routing_update"
  | "load#status_updated";

// PortPro Document Event Types
export type DocumentEventType =
  | "document#pod_added"
  | "document#tir_in_added"
  | "document#tir_out_added"
  | "document#delivery_order_added"
  | "document#invoice_added"
  | "document#bo_added"
  | "document#rate_cron_added";

// All event types
export type WebhookEventType =
  | LoadEventType
  | DocumentEventType
  | "tender#status_changed"
  | "invoice#created"
  | "invoice#charges_updated"
  | "invoice#sub_bill_added"
  | "invoice#sub_bill_charges_updated"
  | "driver#updated"
  | "customer#created";

// Webhook payload structure
export interface WebhookPayload {
  event_type?: string;
  eventType?: string;
  data?: Record<string, any>;
  changedValues?: Record<string, any>;
  reference_number?: string;
  response?: {
    statusCode: number;
  };
}

// Location structure from PortPro
export interface PortProLocation {
  company_name?: string;
  address?: {
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  // Some responses have flat address string
  fullAddress?: string;
}

// Load data structure - matches actual PortPro API response
export interface PortProLoad {
  _id: string;
  reference_number: string;
  type_of_load: LoadType;
  status: string;
  // Container info
  containerNo?: string;
  containerSize?: string; // 20', 40', 45'
  containerType?: string; // HC (High Cube), ST (Standard), RF (Reefer)
  containerOwner?: string;
  chassisNo?: string;
  sealNo?: string;
  weight?: number;
  // Booking info
  bookingNo?: string;
  masterBillOfLading?: string;
  houseBillOfLading?: string;
  // Shipping line
  ssl?: string; // e.g., "COSCO", "ONE", "MSC"
  sslBookingNo?: string;
  // Cargo info
  commodity?: string;
  hazmat?: boolean;
  overweight?: boolean;
  // Customer/Caller
  caller?: {
    _id?: string;
    company_name?: string;
    email?: string;
    phone?: string;
    address?: {
      address1?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };
  // Shipper (origin/port)
  shipper?: PortProLocation;
  // Consignee (delivery destination)
  consignee?: PortProLocation;
  // Terminal/Port info
  terminal?: PortProLocation;
  emptyOrigin?: PortProLocation;
  // Routing locations (these are the actual addresses shown in PortPro UI)
  pickupLocation?: PortProLocation;  // "Pick Up Location" - port/terminal
  deliveryLocation?: PortProLocation; // "Loading Location" - where cargo is delivered
  returnLocation?: PortProLocation;   // "Return Location" - where empty container returns
  // Dates
  pickupTimes?: Array<{
    pickupFromTime?: string;
    pickupToTime?: string;
  }>;
  deliveryTimes?: Array<{
    deliveryFromTime?: string;
    deliveryToTime?: string;
  }>;
  appointmentDate?: string;
  lastFreeDay?: string;
  returnDate?: string;
  // Distance
  totalMiles?: number;
  // Timestamps
  createdAt: string;
  updatedAt?: string;
}

class PortProClient {
  private accessToken: string;
  private refreshToken: string;

  constructor(config: PortProConfig) {
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${PORTPRO_API_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.refreshAccessToken();
      // Retry request
      return this.request<T>(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PortPro API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch(`${PORTPRO_API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh PortPro access token");
    }

    const data = await response.json();
    this.accessToken = data.accessToken;
    // Note: In production, you'd want to store the new token
  }

  /**
   * Get all loads with optional filters
   */
  async getLoads(params?: {
    status?: string;
    type_of_load?: LoadType;
    skip?: number;
    limit?: number;
  }): Promise<PortProLoad[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.type_of_load) searchParams.set("type_of_load", params.type_of_load);
    if (params?.skip) searchParams.set("skip", params.skip.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    const endpoint = `/loads${query ? `?${query}` : ""}`;

    const response = await this.request<{ data: PortProLoad[] }>(endpoint);
    return response.data || [];
  }

  /**
   * Get a single load by reference number
   */
  async getLoadByReference(referenceNumber: string): Promise<PortProLoad | null> {
    try {
      const response = await this.request<{ data: PortProLoad }>(
        `/loads/${referenceNumber}`
      );
      return response.data || null;
    } catch (error) {
      console.error("Error fetching load:", error);
      return null;
    }
  }

  /**
   * Get a single load by ID
   */
  async getLoadById(id: string): Promise<PortProLoad | null> {
    try {
      const response = await this.request<{ data: PortProLoad }>(`/loads/${id}`);
      return response.data || null;
    } catch (error) {
      console.error("Error fetching load:", error);
      return null;
    }
  }

  /**
   * Search loads by container number
   */
  async searchByContainer(containerNumber: string): Promise<PortProLoad[]> {
    const response = await this.request<{ data: PortProLoad[] }>(
      `/loads?containerNo=${encodeURIComponent(containerNumber)}`
    );
    return response.data || [];
  }

  /**
   * Get webhook events
   */
  async getWebhookEvents(params?: {
    type?: string;
    occurred_from?: string;
    occurred_to?: string;
    skip?: number;
    limit?: number;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.occurred_from) searchParams.set("occurred_from", params.occurred_from);
    if (params?.occurred_to) searchParams.set("occurred_to", params.occurred_to);
    if (params?.skip) searchParams.set("skip", params.skip.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());

    const query = searchParams.toString();
    const endpoint = `/webhook${query ? `?${query}` : ""}`;

    const response = await this.request<{ data: any[] }>(endpoint);
    return response.data || [];
  }
}

/**
 * Get PortPro client instance
 */
export function getPortProClient(): PortProClient {
  const accessToken = process.env.PORTPRO_ACCESS_TOKEN;
  const refreshToken = process.env.PORTPRO_REFRESH_TOKEN;

  if (!accessToken || !refreshToken) {
    throw new Error("PortPro credentials not configured");
  }

  return new PortProClient({ accessToken, refreshToken });
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  signature: string | null,
  expectedSecret: string
): boolean {
  if (!signature) return false;

  // PortPro sends signature as: sha1=<token>
  const providedToken = signature.replace("sha1=", "");
  return providedToken === expectedSecret;
}

/**
 * Map PortPro status to our internal status
 */
export function mapPortProStatus(portproStatus: string): string {
  return PORTPRO_STATUS_MAP[portproStatus] || "booked";
}

/**
 * Format a PortPro location into a readable address string
 */
export function formatLocation(location?: PortProLocation): string | null {
  if (!location) return null;

  // If there's a full address string, use it
  if (location.fullAddress) return location.fullAddress;

  // Build address from parts
  const parts: string[] = [];

  if (location.company_name) {
    parts.push(location.company_name);
  }

  if (location.address) {
    const addr = location.address;
    const addressParts: string[] = [];

    if (addr.address1) addressParts.push(addr.address1);
    if (addr.city) addressParts.push(addr.city);
    if (addr.state) {
      if (addr.zip) {
        addressParts.push(`${addr.state} ${addr.zip}`);
      } else {
        addressParts.push(addr.state);
      }
    }
    if (addr.country && addr.country !== "US") addressParts.push(addr.country);

    if (addressParts.length > 0) {
      parts.push(addressParts.join(", "));
    }
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Convert PortPro load to our shipment format
 */
export function convertLoadToShipment(load: PortProLoad) {
  // Determine pickup location (origin) - prioritize pickupLocation, then shipper, then terminal
  const pickupLocation = formatLocation(load.pickupLocation)
    || formatLocation(load.shipper)
    || formatLocation(load.terminal);

  // Determine delivery location - prioritize deliveryLocation, then consignee
  const deliveryLocation = formatLocation(load.deliveryLocation)
    || formatLocation(load.consignee);

  // Return location for empty container
  const returnLocation = formatLocation(load.returnLocation);

  return {
    portpro_load_id: load._id,
    portpro_reference: load.reference_number,
    container_number: load.containerNo || null,
    container_size: load.containerSize || null,
    container_type: load.containerType || null, // HC, ST, RF
    status: mapPortProStatus(load.status),
    // Locations
    origin: pickupLocation,
    destination: deliveryLocation,
    return_location: returnLocation,
    // Customer info
    customer_name: load.caller?.company_name || null,
    customer_email: load.caller?.email || null,
    customer_phone: load.caller?.phone || null,
    // Booking & Shipping
    booking_number: load.bookingNo || null,
    shipping_line: load.ssl || null,
    commodity: load.commodity || null,
    // Dates
    eta: load.deliveryTimes?.[0]?.deliveryFromTime || null,
    last_free_day: load.lastFreeDay || null,
    // Equipment
    weight: load.weight || null,
    seal_number: load.sealNo || null,
    chassis_number: load.chassisNo || null,
    // Distance
    total_miles: load.totalMiles || null,
  };
}
