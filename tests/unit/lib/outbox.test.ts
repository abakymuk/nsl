// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), update: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createUntypedAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }) }));
import { buildSlackMessage, deliverQuoteNotifications } from "@/lib/quotes/outbox";
const quote = { reference_number: "TEST-001", contact_name: "<!channel>", company_name: "Test Company", email: "test@example.test", phone: "555-123-4567", port: "la", request_type: "standard", time_sensitive: false, container_number: "TEST1234567", container_type: "40ft", pickup_terminal: "PCT", delivery_zip: "90210", delivery_type: "warehouse", appointment_required: true, service_type: "import", lfd: "2026-10-20", availability_date: "2026-10-18", special_instructions: "TEST ONLY", created_at: "2026-10-13" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.test/fixture");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.rpc.mockResolvedValue({ data: [{ id: "job", quote_id: "quote", channel: "slack", attempts: 1 }], error: null });
  mocks.update.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mocks.from.mockImplementation((table) => table === "quotes"
    ? { select: () => ({ eq: () => ({ single: async () => ({ data: quote, error: null }) }) }) }
    : { update: mocks.update });
});
afterEach(() => vi.unstubAllGlobals());
describe("Slack-only delivery", () => {
  it("sends all request details as plain text without mentions", () => {
    const message = buildSlackMessage(quote);
    expect(message.mrkdwn).toBe(false);
    expect(message.blocks[0].text.type).toBe("plain_text");
    for (const value of [quote.reference_number, quote.email, quote.phone, quote.container_number, quote.lfd, quote.availability_date, quote.special_instructions]) expect(message.text).toContain(value);
    expect(message.text).toContain("Appointment required: Yes");
  });
  it("marks successful delivery after Slack accepts it", async () => {
    mocks.fetch.mockResolvedValue({ ok: true });
    expect(await deliverQuoteNotifications("quote")).toEqual({ processed: 1, failed: 0 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ delivered_at: expect.any(String), last_error: null }));
  });
  it("keeps a failed job pending for retry", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 429 });
    expect(await deliverQuoteNotifications("quote")).toEqual({ processed: 1, failed: 1 });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ last_error: "Slack returned 429", available_at: expect.any(String) }));
    expect(mocks.update).not.toHaveBeenCalledWith(expect.objectContaining({ delivered_at: expect.anything() }));
  });
  it("does not lose jobs when Slack configuration is missing", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "");
    await expect(deliverQuoteNotifications()).rejects.toThrow("not configured");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not call Slack twice when no pending jobs remain", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect(await deliverQuoteNotifications()).toEqual({ processed: 0, failed: 0 });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
