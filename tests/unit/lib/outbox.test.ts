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
  it("groups complete details into blocks while keeping the notification preview short", () => {
    const message = buildSlackMessage(quote);
    const content = JSON.stringify(message.blocks);
    expect(message.blocks[0].type).toBe("header");
    for (const value of [quote.reference_number, quote.email, quote.phone, quote.container_number, quote.lfd, quote.availability_date, quote.special_instructions]) expect(content).toContain(value);
    expect(content).toContain("Required at delivery");
    expect(message.text.length).toBeLessThan(300);
    expect(message.text).not.toContain(quote.special_instructions);
    expect(content).toContain("PDT");
  });
  it("omits empty optional details and avoids a misleading urgency badge", () => {
    const content = JSON.stringify(buildSlackMessage({ ...quote, email: null, container_number: null, container_type: null, pickup_terminal: null, lfd: null, availability_date: null, special_instructions: null, delivery_type: null, appointment_required: false }));
    for (const absent of ["Not provided", "Email", "Container", "Equipment", "Terminal", "Last free day", "Available", "Notes", "Appointment", "Priority"]) expect(content).not.toContain(absent);
  });
  it("keeps customer input literal without mention or link elements", () => {
    const message = buildSlackMessage({ ...quote, special_instructions: "<!channel> <@U123> *bold* https://example.test" });
    expect(message.mrkdwn).toBe(false);
    const textBlocks = message.blocks.filter(block => block.type === "rich_text");
    const elements = textBlocks.flatMap(block => block.elements.flatMap(section => section.elements));
    expect(elements.every(element => element.type === "text")).toBe(true);
    expect(elements.find(element => element.text === quote.contact_name)?.style).toBeUndefined();
    expect(elements.some(element => element.text.includes("<!channel> <@U123> *bold*"))).toBe(true);
  });
  it("highlights urgent requests and preserves the full maximum-length note", () => {
    const message = buildSlackMessage({ ...quote, time_sensitive: true, special_instructions: "x".repeat(1000) });
    expect(JSON.stringify(message.blocks[0])).toContain("Priority quote request");
    expect(JSON.stringify(message.blocks)).toContain("x".repeat(1000));
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
