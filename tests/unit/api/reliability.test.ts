// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { quoteFormSchema } from "@/lib/validations/quote";

const mocks = vi.hoisted(() => ({
  process: vi.fn(), queue: vi.fn(), from: vi.fn(), notify: vi.fn(), signUp: vi.fn(),
  token: vi.fn(), complete: vi.fn(),
}));
vi.mock("@/lib/portpro-processing", () => ({ processPortProWebhook: mocks.process }));
vi.mock("@/lib/portpro", () => ({ verifyWebhookSignature: () => true }));
vi.mock("@/lib/webhook-dlq", () => ({ pushToDeadLetterQueue: mocks.queue }));
vi.mock("@/lib/supabase/server", () => ({
  createUntypedAdminClient: () => ({ from: mocks.from }),
  createServerClient: async () => ({ auth: { signUp: mocks.signUp } }),
  getUser: async () => null,
}));
vi.mock("@/lib/auth", () => ({ getUserOrgMembership: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => ({ success: true }) }));
vi.mock("@/lib/quotes/outbox", () => ({ deliverQuoteNotifications: mocks.notify }));
vi.mock("@/lib/quotes/tokens", () => ({ getOrCreateStatusToken: mocks.token, buildStatusUrl: (token: string) => `/quote/status/${token}` }));

import { POST as webhook } from "@/app/api/webhooks/portpro/route";
import { POST as quote } from "@/app/api/quote/route";
import { POST as signup, GET as lookup } from "@/app/api/auth/signup/route";
import { registrationSchema } from "@/lib/registration";

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" } });
}
function query(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "eq", "insert"]) chain[name] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  return chain;
}
const form = { fullName: "Alice Test", companyName: "Example Inc", phone: "555-123-4567",
  port: "la", requestType: "standard", timeSensitive: false, deliveryZip: "90210",
  appointmentRequired: false, moveType: "import" };

beforeEach(() => { vi.resetAllMocks(); mocks.token.mockResolvedValue("token"); });

describe("webhook durable handoff", () => {
  it("asks PortPro to retry when both persistence and DLQ fail", async () => {
    mocks.process.mockRejectedValue(new Error("Database down")); mocks.queue.mockResolvedValue(false);
    const res = await webhook(request("/api/webhooks/portpro", { event_type: "load#created", data: {} }));
    expect(res.status).toBe(503); expect(await res.json()).toMatchObject({ queued: false });
  });
  it("acknowledges a failed event only after a durable queue handoff", async () => {
    mocks.process.mockRejectedValue(new Error("Database down")); mocks.queue.mockResolvedValue(true);
    const res = await webhook(request("/api/webhooks/portpro", { event_type: "load#created", data: {} }));
    expect(res.status).toBe(200); expect(await res.json()).toMatchObject({ queued: true });
  });
  it("does not requeue an already committed event", async () => {
    mocks.process.mockResolvedValue({ duplicate: true });
    const res = await webhook(request("/api/webhooks/portpro", { event_type: "load#created", data: {} }));
    expect(await res.json()).toMatchObject({ success: true, duplicate: true });
    expect(mocks.queue).not.toHaveBeenCalled();
  });
});

describe("quote submission", () => {
  const hash = createHash("sha256").update(JSON.stringify({ body: quoteFormSchema.parse(form), organizationId: null })).digest("hex");
  const saved = { id: "saved-id", reference_number: "NSL-TEST", submission_hash: hash };
  it("keeps a saved request successful when notification delivery is unavailable", async () => {
    mocks.from.mockReturnValueOnce(query({ data: null, error: null }))
      .mockReturnValueOnce(query({ data: saved, error: null }));
    mocks.notify.mockRejectedValue(new Error("Email provider unavailable"));
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

describe("registration boundary", () => {
  it("rejects a foreign organization ID without an invitation", async () => {
    const res = await signup(request("/api/auth/signup", {
      email: "bob@example.test", password: "long-password", orgAction: "join",
      orgId: "10000000-0000-4000-8000-000000000001",
    }));
    expect(res.status).toBe(400); expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("does not reveal a token when looking up an arbitrary email", async () => {
    expect(await (await lookup()).json()).toEqual({ hasInvitation: false, hasDomainMatch: false });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects an invitation belonging to another email before creating an account", async () => {
    mocks.from.mockReturnValue(query({ data: { email: "alice@example.test", status: "pending", expires_at: "2099-01-01" }, error: null }));
    const res = await signup(request("/api/auth/signup", {
      email: "bob@example.test", password: "long-password", orgAction: "join", invitationToken: "a".repeat(64),
    }));
    expect(res.status).toBe(403); expect(mocks.signUp).not.toHaveBeenCalled();
  });
  it("requires an organization name when creating a team", () => {
    expect(registrationSchema.safeParse({ email: "a@example.test", password: "long-password", orgAction: "create" }).success).toBe(false);
  });
});
