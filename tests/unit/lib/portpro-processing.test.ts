// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortProLoad } from "@/lib/portpro";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createUntypedAdminClient: () => ({ rpc }) }));
import { portProEventKey, syncPortProLoad } from "@/lib/portpro-processing";

beforeEach(() => { rpc.mockReset(); });

describe("PortPro snapshot transaction boundary", () => {
  it("keeps reference identity out of the mutable database patch", async () => {
    rpc.mockResolvedValue({ data: { id: "load-id", duplicate: false }, error: null });
    const load = { _id: "external-id", reference_number: "REF-1", status: "PENDING",
      containerSize: { name: "40" }, updatedAt: "2026-01-01T00:00:00Z" } as PortProLoad;
    await syncPortProLoad(load);
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe("apply_portpro_event");
    expect(args.p_reference).toBe("REF-1");
    expect(args.p_patch).not.toHaveProperty("portpro_reference");
    expect(args.p_patch.container_size).toBe("40");
  });
  it("propagates transaction failure to the caller for retry", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("Database unavailable") });
    const load = { _id: "external-id", reference_number: "REF-1", status: "PENDING" } as PortProLoad;
    await expect(syncPortProLoad(load)).rejects.toThrow("Database unavailable");
  });
  it("deduplicates equivalent payloads with different object key order", () => {
    expect(portProEventKey({ a: 1, data: { x: 2, y: 3 } }))
      .toBe(portProEventKey({ data: { y: 3, x: 2 }, a: 1 }));
  });
});
