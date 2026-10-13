import { createHash } from "crypto";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { convertLoadToShipment, extractLookupValue, mapPortProStatus, type PortProLoad, type WebhookPayload } from "@/lib/portpro";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${JSON.stringify(key)}:${stableJson(val)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

export function portProEventKey(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

async function applyEvent(key: string, reference: string, patch: Record<string, unknown>,
  events: { status: string; description: string }[], create: boolean, updatedAt?: string) {
  const timestamp = updatedAt && Number.isFinite(Date.parse(updatedAt)) ? new Date(updatedAt).toISOString() : null;
  const { data, error } = await createUntypedAdminClient().rpc("apply_portpro_event", {
    p_key: key, p_reference: reference, p_patch: patch, p_events: events, p_create: create, p_updated_at: timestamp,
  });
  if (error) throw error;
  return data as { duplicate: boolean; id?: string };
}

export async function syncPortProLoad(load: PortProLoad, locations: Partial<Record<"origin" | "destination" | "return_location" | "current_location", string | null>> = {}) {
  // Identity is the transaction's lookup key, never a mutable patch field.
  const { portpro_reference: reference, ...fields } = convertLoadToShipment(load);
  const patch = { ...fields, ...locations,
    container_size: extractLookupValue(load.containerSize ?? null),
    container_type: extractLookupValue(load.containerType ?? null),
    pickup_time: load.pickupTimes?.[0]?.pickupFromTime || null,
  };
  return applyEvent(portProEventKey({ snapshot: load, locations }), reference, patch, [], true, load.updatedAt);
}

export async function processPortProWebhook(payload: WebhookPayload) {
  const type = payload.event_type || payload.eventType;
  const data = { ...payload.data, ...payload.changedValues };
  // Customer creation currently has no local side effect. Unknown events must
  // remain visible for retry/inspection rather than being silently discarded.
  if (type === "customer#created") return { duplicate: false };
  const reference = payload.reference_number || data.reference_number || data.loadReferenceNumber;
  if (!reference) throw new Error("Missing PortPro load reference");
  const patch: Record<string, unknown> = {};
  const events: { status: string; description: string }[] = [];
  switch (type) {
    case "load#created":
      Object.assign(patch, {
        portpro_load_id: data._id, container_number: data.containerNo || null,
        status: mapPortProStatus(data.status || "PENDING"),
        origin: data.shipper?.address || data.shipper?.company_name || null,
        destination: data.consignee?.address || data.consignee?.company_name || null,
        customer_name: data.caller?.company_name || null, customer_email: data.caller?.email || null,
        eta: data.deliveryTimes?.[0]?.deliveryFromTime || null,
      });
      events.push({ status: String(patch.status), description: `Load created in PortPro: ${reference}` });
      break;
    case "load#status_updated": {
      const status = data.status || data.newStatus;
      if (!status) throw new Error("Missing PortPro status");
      patch.status = mapPortProStatus(status);
      events.push({ status: String(patch.status), description: `Status updated to ${status}` });
      break;
    }
    case "load#info_updated":
    case "load#dates_updated":
      if (data.deliveryTimes?.[0]?.deliveryFromTime) patch.eta = data.deliveryTimes[0].deliveryFromTime;
      if (data.pickupTimes?.[0]?.pickupFromTime) patch.pickup_time = data.pickupTimes[0].pickupFromTime;
      if (data.containerNo) patch.container_number = data.containerNo;
      if (data.containerSize) patch.container_size = extractLookupValue(data.containerSize);
      break;
    case "load#equipment_updated":
      if (data.containerNo) patch.container_number = data.containerNo;
      if (data.chassisNo) patch.chassis_number = data.chassisNo;
      if (data.sealNo) patch.seal_number = data.sealNo;
      break;
    case "document#pod_added":
      patch.status = "delivered";
      events.push({ status: "delivered", description: "Proof of delivery received" });
      break;
    case "document#delivery_order_added":
      events.push({ status: "document", description: "DO document added" });
      break;
    case "tender#status_changed":
      if (!data.status) throw new Error("Missing tender status");
      events.push({ status: "tender", description: `Tender ${data.status}` });
      break;
    default: throw new Error(`Unsupported PortPro event: ${type}`);
  }
  return applyEvent(portProEventKey(payload), reference, patch, events, type === "load#created", data.updatedAt || data.createdAt);
}
