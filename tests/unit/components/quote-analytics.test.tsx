import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import QuoteForm from "@/app/quote/quote-form";

const { track, push } = vi.hoisted(() => ({ track: vi.fn(), push: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => { track.mockClear(); push.mockClear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fillForm() {
  fireEvent.change(screen.getByLabelText(/^Your Name/), { target: { value: "TEST Person" } });
  fireEvent.change(screen.getByLabelText(/^Company/), { target: { value: "TEST Company" } });
  fireEvent.change(screen.getByLabelText(/^Phone/), { target: { value: "2025550143" } });
  fireEvent.change(screen.getByLabelText(/^Port/), { target: { value: "la" } });
  fireEvent.change(screen.getByLabelText(/^Delivery ZIP Code/), { target: { value: "90210" } });
}
describe("quote funnel events", () => {
  it("counts success only after server acknowledgement and sends no form values", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, referenceNumber: "TEST-123" }) }));
    render(<QuoteForm />);
    fillForm();
    expect(track.mock.calls.filter(([name]) => name === "NSL: Quote Form Started")).toHaveLength(1);
    expect(track).not.toHaveBeenCalledWith("NSL: Quote Submit Succeeded", expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(track).toHaveBeenCalledWith("NSL: Quote Submit Succeeded", { port: "la", duration_seconds: expect.any(Number), $insert_id: expect.stringMatching(/^quote-success:/) });
    const events = JSON.stringify(track.mock.calls);
    for (const value of ["TEST Person", "TEST Company", "2025550143", "90210", "TEST-123"]) expect(events).not.toContain(value);
  });
  it("records validation field names without submitting or counting a conversion", () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    render(<QuoteForm />);
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
    expect(track).toHaveBeenCalledWith("NSL: Quote Validation Failed", { invalid_fields: expect.arrayContaining(["phone", "port"]) });
    expect(fetch).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
  it("records a classified failure without logging raw server errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: "private server detail" }) }));
    render(<QuoteForm />); fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));
    await waitFor(() => expect(track).toHaveBeenCalledWith("NSL: Quote Submit Failed", { error_type: "rate_limit" }));
    expect(track).not.toHaveBeenCalledWith("NSL: Quote Submit Succeeded", expect.anything());
    expect(JSON.stringify(track.mock.calls)).not.toContain("private server detail");
    expect(screen.getByLabelText(/^Your Name/)).toHaveValue("TEST Person");
  });
});
