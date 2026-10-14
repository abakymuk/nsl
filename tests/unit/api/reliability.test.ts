// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { quoteFormSchema } from "@/lib/validations/quote";
const mocks = vi.hoisted(() => ({ from: vi.fn(), notify: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createUntypedAdminClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.limit,
  rateLimitResponse: () => new Response("Too many requests", { status: 429 }),
}));
vi.mock("@/lib/quotes/outbox", () => ({ deliverQuoteNotifications: mocks.notify }));
import { POST as quote } from "@/app/api/quote/route";
function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
}
function query(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq", "insert"]) chain[name] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  return chain;
}
const form = { fullName: "Alice Test", companyName: "Example Inc", phone: "555-123-4567", port: "la", requestType: "standard", timeSensitive: false, deliveryZip: "90210", appointmentRequired: false, moveType: "import" };
beforeEach(() => { vi.resetAllMocks(); mocks.limit.mockResolvedValue(true); });
describe("quote submission", () => {
  const hash = createHash("sha256").update(JSON.stringify({ body: quoteFormSchema.parse(form), organizationId: null })).digest("hex");
  const saved = { id: "saved-id", reference_number: "NSL-TEST", submission_hash: hash };
  it("keeps a saved request successful when notification delivery is unavailable", async () => {
    mocks.from.mockReturnValueOnce(query({ data: null, error: null }))
      .mockReturnValueOnce(query({ data: saved, error: null }));
    mocks.notify.mockRejectedValue(new Error("Slack provider unavailable"));
    const res = await quote(request("/api/quote", form));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, referenceNumber: "NSL-TEST" });
  });
  it("reuses the saved reference on a matching retry without inserting again", async () => {
    const lookup = query({ data: saved, error: null });
    mocks.from.mockReturnValue(lookup);
    const req = request("/api/quote", form);
    req.headers.set("idempotency-key", "10000000-0000-4000-8000-000000000001");
    const res = await quote(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ referenceNumber: "NSL-TEST" });
    expect(lookup.insert).not.toHaveBeenCalled();
  });
  it("rejects changed details under an already used key", async () => {
    mocks.from.mockReturnValue(query({ data: saved, error: null }));
    const res = await quote(request("/api/quote", { ...form, deliveryZip: "90211" }));
    expect(res.status).toBe(409);
    expect(mocks.notify).not.toHaveBeenCalled();
  });
  it("does not report success or send notifications when saving fails", async () => {
    mocks.from.mockReturnValueOnce(query({ data: null, error: null }))
      .mockReturnValueOnce(query({ data: null, error: { message: "Database down" } }));
    const res = await quote(request("/api/quote", form));
    expect(res.status).toBe(503);
    expect(mocks.notify).not.toHaveBeenCalled();
    expect(await res.json()).not.toHaveProperty("success", true);
  });
  it("rejects malformed idempotency keys before accessing the database", async () => {
    const req = request("/api/quote", form); req.headers.set("idempotency-key", "wrong");
    expect((await quote(req)).status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});


describe("quote protection", () => {
  it("rejects rate-limited requests before saving", async () => {
    mocks.limit.mockResolvedValue(false);
    expect((await quote(request("/api/quote", form))).status).toBe(429);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("fails closed if rate-limit storage is unavailable", async () => {
    mocks.limit.mockRejectedValue(new Error("Database unavailable"));
    expect((await quote(request("/api/quote", form))).status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects invalid fields and oversized input", async () => {
    expect((await quote(request("/api/quote", {}))).status).toBe(400);
    expect((await quote(request("/api/quote", { notes: "x".repeat(16001) }))).status).toBe(413);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
