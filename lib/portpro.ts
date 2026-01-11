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

// Load data structure
export interface PortProLoad {
  _id: string;
  reference_number: string;
  type_of_load: LoadType;
  status: string;
  containerNo?: string;
  containerSize?: string;
  containerType?: string;
  containerOwner?: string;
  chassisNo?: string;
  sealNo?: string;
  weight?: number;
  caller?: {
    company_name?: string;
    email?: string;
    phone?: string;
  };
  shipper?: {
    company_name?: string;
    address?: string;
  };
  consignee?: {
    company_name?: string;
    address?: string;
  };
  pickupTimes?: Array<{
    pickupFromTime?: string;
    pickupToTime?: string;
  }>;
  deliveryTimes?: Array<{
    deliveryFromTime?: string;
    deliveryToTime?: string;
  }>;
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
 * Convert PortPro load to our shipment format
 */
export function convertLoadToShipment(load: PortProLoad) {
  return {
    portpro_load_id: load._id,
    portpro_reference: load.reference_number,
    container_number: load.containerNo || null,
    container_size: load.containerSize || null,
    status: mapPortProStatus(load.status),
    origin: load.shipper?.address || load.shipper?.company_name || null,
    destination: load.consignee?.address || load.consignee?.company_name || null,
    customer_name: load.caller?.company_name || null,
    customer_email: load.caller?.email || null,
    eta: load.deliveryTimes?.[0]?.deliveryFromTime || null,
    weight: load.weight || null,
    seal_number: load.sealNo || null,
    chassis_number: load.chassisNo || null,
  };
}
