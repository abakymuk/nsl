/**
 * Tests for PortPro TMS integration - pure functions
 */
import { describe, it, expect } from "vitest";
import {
  extractLookupValue,
  verifyWebhookSignature,
  mapPortProStatus,
  formatLocation,
  convertLoadToShipment,
  PORTPRO_STATUS_MAP,
  type PortProLocation,
  type PortProLoad,
} from "@/lib/portpro";
import crypto from "crypto";

describe("extractLookupValue", () => {
  it("returns null for null input", () => {
    expect(extractLookupValue(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(extractLookupValue(undefined as unknown as null)).toBeNull();
  });

  it("returns string as-is", () => {
    expect(extractLookupValue("40HC")).toBe("40HC");
    expect(extractLookupValue("High Cube")).toBe("High Cube");
  });

  it("extracts label from object with label", () => {
    expect(extractLookupValue({ _id: "123", label: "40 High Cube" })).toBe("40 High Cube");
  });

  it("falls back to name if no label", () => {
    expect(extractLookupValue({ _id: "123", name: "Standard" })).toBe("Standard");
  });

  it("returns null for object with neither label nor name", () => {
    expect(extractLookupValue({ _id: "123" })).toBeNull();
  });

  it("prefers label over name", () => {
    expect(extractLookupValue({ label: "Label", name: "Name" })).toBe("Label");
  });
});

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret";
  const body = JSON.stringify({ event: "test", data: {} });

  function createValidSignature(payload: string, secret: string): string {
    const hash = crypto.createHmac("sha1", secret).update(payload, "utf8").digest("hex");
    return `sha1=${hash}`;
  }

  it("returns false for null signature", () => {
    expect(verifyWebhookSignature(null, body, secret)).toBe(false);
  });

  it("returns false for empty secret", () => {
    const signature = createValidSignature(body, secret);
    expect(verifyWebhookSignature(signature, body, "")).toBe(false);
  });

  it("returns false for wrong algorithm", () => {
    const hash = crypto.createHmac("sha1", secret).update(body, "utf8").digest("hex");
    expect(verifyWebhookSignature(`sha256=${hash}`, body, secret)).toBe(false);
  });

  it("returns false for missing hash in signature", () => {
    expect(verifyWebhookSignature("sha1=", body, secret)).toBe(false);
  });

  it("returns false for invalid signature format", () => {
    expect(verifyWebhookSignature("invalid", body, secret)).toBe(false);
  });

  it("accepts valid HMAC-SHA1 signature", () => {
    const signature = createValidSignature(body, secret);
    expect(verifyWebhookSignature(signature, body, secret)).toBe(true);
  });

  it("rejects invalid signature (wrong hash)", () => {
    const wrongSignature = "sha1=0000000000000000000000000000000000000000";
    expect(verifyWebhookSignature(wrongSignature, body, secret)).toBe(false);
  });

  it("rejects signature computed with wrong secret", () => {
    const wrongSignature = createValidSignature(body, "wrong-secret");
    expect(verifyWebhookSignature(wrongSignature, body, secret)).toBe(false);
  });

  it("rejects signature for modified body", () => {
    const signature = createValidSignature(body, secret);
    const modifiedBody = JSON.stringify({ event: "modified", data: {} });
    expect(verifyWebhookSignature(signature, modifiedBody, secret)).toBe(false);
  });

  it("handles malformed hex in signature", () => {
    expect(verifyWebhookSignature("sha1=notvalidhex", body, secret)).toBe(false);
  });
});

describe("mapPortProStatus", () => {
  it("maps PENDING to booked", () => {
    expect(mapPortProStatus("PENDING")).toBe("booked");
  });

  it("maps DISPATCHED to in_transit", () => {
    expect(mapPortProStatus("DISPATCHED")).toBe("in_transit");
  });

  it("maps PICKED UP to picked_up", () => {
    expect(mapPortProStatus("PICKED UP")).toBe("picked_up");
  });

  it("maps DROPPED to out_for_delivery", () => {
    expect(mapPortProStatus("DROPPED")).toBe("out_for_delivery");
  });

  it("maps COMPLETED to delivered", () => {
    expect(mapPortProStatus("COMPLETED")).toBe("delivered");
  });

  it("maps BILLING to delivered", () => {
    expect(mapPortProStatus("BILLING")).toBe("delivered");
  });

  it("maps PARTIAL_PAID to delivered", () => {
    expect(mapPortProStatus("PARTIAL_PAID")).toBe("delivered");
  });

  it("maps FULL_PAID to delivered", () => {
    expect(mapPortProStatus("FULL_PAID")).toBe("delivered");
  });

  it("maps CANCELLED to cancelled", () => {
    expect(mapPortProStatus("CANCELLED")).toBe("cancelled");
  });

  it("maps CUSTOMS HOLD to at_terminal", () => {
    expect(mapPortProStatus("CUSTOMS HOLD")).toBe("at_terminal");
  });

  it("maps FREIGHT HOLD to at_terminal", () => {
    expect(mapPortProStatus("FREIGHT HOLD")).toBe("at_terminal");
  });

  it("maps AVAILABLE to at_terminal", () => {
    expect(mapPortProStatus("AVAILABLE")).toBe("at_terminal");
  });

  it("defaults to booked for unknown status", () => {
    expect(mapPortProStatus("UNKNOWN_STATUS")).toBe("booked");
    expect(mapPortProStatus("")).toBe("booked");
    expect(mapPortProStatus("RANDOM")).toBe("booked");
  });

  it("maps all defined statuses correctly", () => {
    for (const [portproStatus, internalStatus] of Object.entries(PORTPRO_STATUS_MAP)) {
      expect(mapPortProStatus(portproStatus)).toBe(internalStatus);
    }
  });
});

describe("formatLocation", () => {
  it("returns null for undefined location", () => {
    expect(formatLocation(undefined)).toBeNull();
  });

  it("returns null for empty location object", () => {
    expect(formatLocation({})).toBeNull();
  });

  it("returns fullAddress if present", () => {
    const location: PortProLocation = {
      fullAddress: "123 Main St, Los Angeles, CA 90210",
    };
    expect(formatLocation(location)).toBe("123 Main St, Los Angeles, CA 90210");
  });

  it("formats company name only", () => {
    const location: PortProLocation = {
      company_name: "Acme Corp",
    };
    expect(formatLocation(location)).toBe("Acme Corp");
  });

  it("formats full address from parts", () => {
    const location: PortProLocation = {
      company_name: "APM Terminal",
      address: {
        address1: "2500 Navy Way",
        city: "San Pedro",
        state: "CA",
        zip: "90731",
      },
    };
    const result = formatLocation(location);
    expect(result).toContain("APM Terminal");
    expect(result).toContain("2500 Navy Way");
    expect(result).toContain("San Pedro");
    expect(result).toContain("CA 90731");
  });

  it("formats address without company name", () => {
    const location: PortProLocation = {
      address: {
        city: "Los Angeles",
        state: "CA",
      },
    };
    expect(formatLocation(location)).toBe("Los Angeles, CA");
  });

  it("includes country if not US", () => {
    const location: PortProLocation = {
      address: {
        city: "Vancouver",
        state: "BC",
        country: "Canada",
      },
    };
    const result = formatLocation(location);
    expect(result).toContain("Canada");
  });

  it("omits country if US", () => {
    const location: PortProLocation = {
      address: {
        city: "Los Angeles",
        state: "CA",
        country: "US",
      },
    };
    const result = formatLocation(location);
    expect(result).not.toContain("US");
  });

  it("handles state without zip", () => {
    const location: PortProLocation = {
      address: {
        city: "Los Angeles",
        state: "CA",
      },
    };
    expect(formatLocation(location)).toBe("Los Angeles, CA");
  });

  it("handles partial address with only city", () => {
    const location: PortProLocation = {
      address: {
        city: "Los Angeles",
      },
    };
    expect(formatLocation(location)).toBe("Los Angeles");
  });
});

describe("convertLoadToShipment", () => {
  const baseLoad: PortProLoad = {
    _id: "pp-123",
    reference_number: "REF-001",
    type_of_load: "IMPORT",
    status: "DISPATCHED",
    containerNo: "MSCU1234567",
    createdAt: "2026-01-26T10:00:00Z",
  };

  it("maps basic fields correctly", () => {
    const result = convertLoadToShipment(baseLoad);
    expect(result.portpro_load_id).toBe("pp-123");
    expect(result.portpro_reference).toBe("REF-001");
    expect(result.container_number).toBe("MSCU1234567");
    expect(result.status).toBe("in_transit"); // DISPATCHED maps to in_transit
  });

  it("maps status using mapPortProStatus", () => {
    const pendingLoad = { ...baseLoad, status: "PENDING" };
    expect(convertLoadToShipment(pendingLoad).status).toBe("booked");

    const completedLoad = { ...baseLoad, status: "COMPLETED" };
    expect(convertLoadToShipment(completedLoad).status).toBe("delivered");
  });

  it("handles missing optional fields", () => {
    const result = convertLoadToShipment(baseLoad);
    expect(result.origin).toBeNull();
    expect(result.destination).toBeNull();
    expect(result.customer_name).toBeNull();
    expect(result.weight).toBeNull();
    expect(result.seal_number).toBeNull();
  });

  it("extracts customer info from caller", () => {
    const loadWithCaller: PortProLoad = {
      ...baseLoad,
      caller: {
        company_name: "Acme Corp",
        email: "acme@example.com",
        phone: "555-1234",
      },
    };
    const result = convertLoadToShipment(loadWithCaller);
    expect(result.customer_name).toBe("Acme Corp");
    expect(result.customer_email).toBe("acme@example.com");
    expect(result.customer_phone).toBe("555-1234");
  });

  it("prioritizes pickupLocation for origin", () => {
    const loadWithLocations: PortProLoad = {
      ...baseLoad,
      pickupLocation: { company_name: "Pickup Terminal" },
      shipper: { company_name: "Shipper" },
      terminal: { company_name: "Terminal" },
    };
    const result = convertLoadToShipment(loadWithLocations);
    expect(result.origin).toBe("Pickup Terminal");
  });

  it("falls back to shipper then terminal for origin", () => {
    const loadWithShipper: PortProLoad = {
      ...baseLoad,
      shipper: { company_name: "Shipper Location" },
      terminal: { company_name: "Terminal" },
    };
    expect(convertLoadToShipment(loadWithShipper).origin).toBe("Shipper Location");

    const loadWithTerminalOnly: PortProLoad = {
      ...baseLoad,
      terminal: { company_name: "Terminal Only" },
    };
    expect(convertLoadToShipment(loadWithTerminalOnly).origin).toBe("Terminal Only");
  });

  it("prioritizes deliveryLocation for destination", () => {
    const loadWithLocations: PortProLoad = {
      ...baseLoad,
      deliveryLocation: { company_name: "Delivery Address" },
      consignee: { company_name: "Consignee" },
    };
    const result = convertLoadToShipment(loadWithLocations);
    expect(result.destination).toBe("Delivery Address");
  });

  it("calculates margin from billing data", () => {
    const loadWithBilling: PortProLoad = {
      ...baseLoad,
      totalAmount: 1000,
      expense: [{ amount: 100 }, { finalAmount: 150 }],
      driverPay: [{ amount: 200 }],
    };
    const result = convertLoadToShipment(loadWithBilling);
    // Margin = 1000 - (100 + 150 + 200) = 550
    expect(result.load_margin).toBe(550);
  });

  it("returns null margin when totalAmount missing", () => {
    const loadWithoutTotal: PortProLoad = {
      ...baseLoad,
      expense: [{ amount: 100 }],
    };
    const result = convertLoadToShipment(loadWithoutTotal);
    expect(result.load_margin).toBeNull();
  });

  it("handles vendorPay with nested pricing", () => {
    const loadWithVendorPay: PortProLoad = {
      ...baseLoad,
      totalAmount: 1000,
      vendorPay: [
        { totalAmount: 300 },
        { pricing: [{ amount: 50 }, { finalAmount: 75 }] },
      ],
    };
    const result = convertLoadToShipment(loadWithVendorPay);
    // Margin = 1000 - (300 + 50 + 75) = 575
    expect(result.load_margin).toBe(575);
  });

  it("handles empty cost arrays", () => {
    const loadWithEmptyCosts: PortProLoad = {
      ...baseLoad,
      totalAmount: 1000,
      expense: [],
      vendorPay: [],
      driverPay: [],
    };
    const result = convertLoadToShipment(loadWithEmptyCosts);
    expect(result.load_margin).toBe(1000);
  });

  it("maps equipment fields", () => {
    const loadWithEquipment: PortProLoad = {
      ...baseLoad,
      weight: 45000,
      sealNo: "SEAL123",
      chassisNo: "CHAS456",
      totalMiles: 150,
    };
    const result = convertLoadToShipment(loadWithEquipment);
    expect(result.weight).toBe(45000);
    expect(result.seal_number).toBe("SEAL123");
    expect(result.chassis_number).toBe("CHAS456");
    expect(result.total_miles).toBe(150);
  });

  it("maps booking and shipping info", () => {
    const loadWithBooking: PortProLoad = {
      ...baseLoad,
      bookingNo: "BOOK123",
      ssl: "COSCO",
      commodity: "Electronics",
      lastFreeDay: "2026-01-30",
    };
    const result = convertLoadToShipment(loadWithBooking);
    expect(result.booking_number).toBe("BOOK123");
    expect(result.shipping_line).toBe("COSCO");
    expect(result.commodity).toBe("Electronics");
    expect(result.last_free_day).toBe("2026-01-30");
  });

  it("extracts ETA from deliveryTimes", () => {
    const loadWithDeliveryTimes: PortProLoad = {
      ...baseLoad,
      deliveryTimes: [
        { deliveryFromTime: "2026-01-27T14:00:00Z", deliveryToTime: "2026-01-27T18:00:00Z" },
      ],
    };
    const result = convertLoadToShipment(loadWithDeliveryTimes);
    expect(result.eta).toBe("2026-01-27T14:00:00Z");
  });
});
