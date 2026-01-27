/**
 * Quick-win tests for quote validation pure functions
 * These tests can be run immediately without any mocking
 */
import { describe, it, expect } from "vitest";
import {
  quoteFormSchema,
  calculateLeadScore,
  isUrgentLead,
  type QuoteFormOutput,
} from "@/lib/validations/quote";

describe("quoteFormSchema", () => {
  const validFormData = {
    fullName: "John Doe",
    companyName: "Acme Corp",
    phone: "555-123-4567",
    email: "john@acme.com",
    port: "la",
    requestType: "standard",
    timeSensitive: false,
    containerNumber: "MSCU1234567",
    terminal: "APM Terminals",
    deliveryZip: "90210",
    deliveryType: "business",
    appointmentRequired: false,
  };

  describe("required fields", () => {
    it("requires fullName min 2 chars", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, fullName: "J" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Full name is required");
      }
    });

    it("requires companyName min 2 chars", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, companyName: "A" });
      expect(result.success).toBe(false);
    });

    it("requires phone number", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, phone: "" });
      expect(result.success).toBe(false);
    });

    it("requires deliveryZip", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, deliveryZip: "" });
      expect(result.success).toBe(false);
    });

    it("requires port selection", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, port: "" });
      expect(result.success).toBe(false);
    });

    it("requires requestType", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, requestType: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("format validation", () => {
    it("validates phone format (10 digits)", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, phone: "123" });
      expect(result.success).toBe(false);
    });

    it("accepts valid phone formats", () => {
      const validPhones = [
        "555-123-4567",
        "(555) 123-4567",
        "5551234567",
        "+1 555-123-4567",
      ];
      for (const phone of validPhones) {
        const result = quoteFormSchema.safeParse({ ...validFormData, phone });
        expect(result.success).toBe(true);
      }
    });

    it("validates email format", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, email: "invalid-email" });
      expect(result.success).toBe(false);
    });

    it("allows empty email", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, email: "" });
      expect(result.success).toBe(true);
    });

    it("validates container number format", () => {
      const result = quoteFormSchema.safeParse({
        ...validFormData,
        containerNumber: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid container number format (4 letters + 7 digits)", () => {
      const result = quoteFormSchema.safeParse({
        ...validFormData,
        containerNumber: "MSCU1234567",
      });
      expect(result.success).toBe(true);
    });

    it("validates ZIP code format (5 digits)", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, deliveryZip: "123" });
      expect(result.success).toBe(false);
    });

    it("accepts 5-digit ZIP code", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, deliveryZip: "90210" });
      expect(result.success).toBe(true);
    });

    it("accepts ZIP+4 format", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, deliveryZip: "90210-1234" });
      expect(result.success).toBe(true);
    });
  });

  describe("transformations", () => {
    it("transforms container number to uppercase", () => {
      const result = quoteFormSchema.safeParse({
        ...validFormData,
        containerNumber: "mscu1234567",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.containerNumber).toBe("MSCU1234567");
      }
    });

    it("trims whitespace from text fields", () => {
      const result = quoteFormSchema.safeParse({
        ...validFormData,
        fullName: "  John Doe  ",
        companyName: "  Acme Corp  ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName).toBe("John Doe");
        expect(result.data.companyName).toBe("Acme Corp");
      }
    });
  });

  describe("optional fields", () => {
    it("allows missing optional fields", () => {
      const minimalData = {
        fullName: "John Doe",
        companyName: "Acme Corp",
        phone: "555-123-4567",
        port: "la",
        requestType: "standard",
        deliveryZip: "90210",
      };
      const result = quoteFormSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });

  describe("enum validation", () => {
    it("rejects invalid port", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, port: "nyc" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid requestType", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, requestType: "invalid" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid terminal", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, terminal: "Unknown Terminal" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid deliveryType", () => {
      const result = quoteFormSchema.safeParse({ ...validFormData, deliveryType: "invalid" });
      expect(result.success).toBe(false);
    });
  });
});

describe("calculateLeadScore", () => {
  const baseData: QuoteFormOutput = {
    fullName: "John Doe",
    companyName: "Acme Corp",
    phone: "555-123-4567",
    port: "la",
    requestType: "standard",
    timeSensitive: false,
    deliveryZip: "90210",
    appointmentRequired: false,
    moveType: "import",
  };

  it("returns base score for minimal data", () => {
    // Standard request = 0, phone = 1
    const score = calculateLeadScore(baseData);
    expect(score).toBe(1); // Only phone provided
  });

  it("adds 2 points for urgent_lfd request type", () => {
    const data = { ...baseData, requestType: "urgent_lfd" };
    const score = calculateLeadScore(data);
    expect(score).toBe(3); // urgent_lfd (2) + phone (1)
  });

  it("adds 1 point for rolled request type", () => {
    const data = { ...baseData, requestType: "rolled" };
    const score = calculateLeadScore(data);
    expect(score).toBe(2); // rolled (1) + phone (1)
  });

  it("adds 1 point for hold_released request type", () => {
    const data = { ...baseData, requestType: "hold_released" };
    const score = calculateLeadScore(data);
    expect(score).toBe(2); // hold_released (1) + phone (1)
  });

  it("adds 2 points for timeSensitive flag", () => {
    const data = { ...baseData, timeSensitive: true };
    const score = calculateLeadScore(data);
    expect(score).toBe(3); // timeSensitive (2) + phone (1)
  });

  it("adds 1 point for container number provided", () => {
    const data = { ...baseData, containerNumber: "MSCU1234567" };
    const score = calculateLeadScore(data);
    expect(score).toBe(2); // containerNumber (1) + phone (1)
  });

  it("adds 2 points when LFD within 3 days", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const data = { ...baseData, lfd: tomorrow.toISOString().split("T")[0] };
    const score = calculateLeadScore(data);
    expect(score).toBe(3); // near LFD (2) + phone (1)
  });

  it("does not add LFD points if LFD is more than 3 days away", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const data = { ...baseData, lfd: future.toISOString().split("T")[0] };
    const score = calculateLeadScore(data);
    expect(score).toBe(1); // Only phone
  });

  it("combines multiple scoring factors", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const data: QuoteFormOutput = {
      ...baseData,
      requestType: "urgent_lfd", // +2
      timeSensitive: true, // +2
      containerNumber: "MSCU1234567", // +1
      lfd: tomorrow.toISOString().split("T")[0], // +2
      // phone is always +1
    };
    const score = calculateLeadScore(data);
    expect(score).toBe(8); // 2 + 2 + 1 + 2 + 1
  });
});

describe("isUrgentLead", () => {
  const baseData: QuoteFormOutput = {
    fullName: "John Doe",
    companyName: "Acme Corp",
    phone: "555-123-4567",
    port: "la",
    requestType: "standard",
    timeSensitive: false,
    deliveryZip: "90210",
    appointmentRequired: false,
    moveType: "import",
  };

  it("returns true for score >= 3", () => {
    expect(isUrgentLead(3, baseData)).toBe(true);
    expect(isUrgentLead(5, baseData)).toBe(true);
    expect(isUrgentLead(10, baseData)).toBe(true);
  });

  it("returns false for score < 3 with standard request", () => {
    expect(isUrgentLead(0, baseData)).toBe(false);
    expect(isUrgentLead(1, baseData)).toBe(false);
    expect(isUrgentLead(2, baseData)).toBe(false);
  });

  it("returns true for urgent_lfd request type regardless of score", () => {
    const data = { ...baseData, requestType: "urgent_lfd" };
    expect(isUrgentLead(0, data)).toBe(true);
    expect(isUrgentLead(1, data)).toBe(true);
  });

  it("returns true for rolled request type regardless of score", () => {
    const data = { ...baseData, requestType: "rolled" };
    expect(isUrgentLead(0, data)).toBe(true);
  });

  it("returns true for hold_released request type regardless of score", () => {
    const data = { ...baseData, requestType: "hold_released" };
    expect(isUrgentLead(0, data)).toBe(true);
  });

  it("returns false for standard request with low score", () => {
    expect(isUrgentLead(2, baseData)).toBe(false);
  });

  it("returns false for not_sure request with low score", () => {
    const data = { ...baseData, requestType: "not_sure" };
    expect(isUrgentLead(2, data)).toBe(false);
  });
});
