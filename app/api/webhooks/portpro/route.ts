import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  verifyWebhookSignature,
  mapPortProStatus,
  WebhookPayload,
  WebhookEventType,
} from "@/lib/portpro";
import { pushToDeadLetterQueue } from "@/lib/webhook-dlq";
import {
  generateIdempotencyKey,
  isDuplicateEvent,
  markEventProcessed,
} from "@/lib/webhook-dedup";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase environment variables are not configured");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/**
 * PortPro Webhook Handler
 * Receives events from PortPro TMS and syncs with our database
 */
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const payload: WebhookPayload = JSON.parse(body);

    // Log incoming webhook headers for debugging
    const signature = request.headers.get("X-Hub-Signature");
    const authHeader = request.headers.get("Authorization");
    console.log("Webhook received - Headers:", {
      "X-Hub-Signature": signature ? "present" : "missing",
      "Authorization": authHeader ? "present" : "missing",
    });

    // Verify webhook signature (HMAC-SHA1) - skip if no signature header
    const webhookSecret = process.env.PORTPRO_WEBHOOK_SECRET;
    if (signature && webhookSecret && !verifyWebhookSignature(signature, body, webhookSecret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Get event type (PortPro uses both event_type and eventType)
    const eventType = (payload.event_type || payload.eventType) as WebhookEventType;
    const referenceNumber = payload.reference_number || payload.data?.reference_number;
    const timestamp = payload.data?.updatedAt || payload.data?.createdAt;

    console.log(`PortPro webhook received: ${eventType}`, { referenceNumber });

    // Check for duplicate events (idempotency)
    const idempotencyKey = generateIdempotencyKey(eventType, referenceNumber, timestamp);
    if (await isDuplicateEvent(idempotencyKey)) {
      return NextResponse.json({ success: true, duplicate: true, event: eventType });
    }

    // Log webhook event to database for debugging/auditing
    await supabase.from("portpro_webhook_logs").insert({
      event_type: eventType,
      reference_number: referenceNumber,
      payload: payload,
    });

    // Process based on event type (wrapped in try-catch for DLQ)
    try {
      switch (eventType) {
        case "load#created":
          await handleLoadCreated(payload);
          break;

        case "load#status_updated":
          await handleLoadStatusUpdated(payload);
          break;

        case "load#info_updated":
        case "load#dates_updated":
          await handleLoadInfoUpdated(payload);
          break;

        case "load#equipment_updated":
          await handleEquipmentUpdated(payload);
          break;

        case "document#pod_added":
          await handleDocumentAdded(payload, "POD");
          break;

        case "document#delivery_order_added":
          await handleDocumentAdded(payload, "DO");
          break;

        case "tender#status_changed":
          await handleTenderStatusChanged(payload);
          break;

        case "customer#created":
          await handleCustomerCreated(payload);
          break;

        default:
          console.log(`Unhandled event type: ${eventType}`);
      }

      // Mark event as processed for deduplication
      await markEventProcessed(idempotencyKey);

      // Return 200 immediately as required by PortPro
      return NextResponse.json({ success: true, event: eventType });
    } catch (processingError) {
      // Push to dead letter queue for retry
      const errorMessage = processingError instanceof Error
        ? processingError.message
        : "Unknown processing error";

      console.error(`Webhook processing failed: ${eventType}`, errorMessage);

      await pushToDeadLetterQueue(eventType, body, errorMessage);

      // Still return 200 to PortPro (we handle retries via DLQ)
      return NextResponse.json({
        success: false,
        queued: true,
        error: "Processing failed, queued for retry",
      });
    }
  } catch (error) {
    console.error("Error processing PortPro webhook:", error);
    // Still return 200 to prevent retries for parsing errors
    return NextResponse.json({ success: false, error: "Processing error" });
  }
}

/**
 * Handle new load creation
 */
async function handleLoadCreated(payload: WebhookPayload) {
  const supabase = getSupabase();
  const data = payload.data;
  if (!data) return;

  const referenceNumber = data.reference_number;
  const status = mapPortProStatus(data.status || "PENDING");

  // Check if load already exists
  const { data: existing } = await supabase
    .from("loads")
    .select("id")
    .eq("portpro_reference", referenceNumber)
    .single();

  if (existing) {
    console.log(`Shipment already exists for ${referenceNumber}`);
    return;
  }

  // Create tracking number
  const trackingNumber = `NSL${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Create new shipment
  const { data: shipment, error } = await supabase
    .from("loads")
    .insert({
      tracking_number: trackingNumber,
      portpro_reference: referenceNumber,
      portpro_load_id: data._id,
      container_number: data.containerNo || null,
      status,
      origin: data.shipper?.address || data.shipper?.company_name || null,
      destination: data.consignee?.address || data.consignee?.company_name || null,
      customer_name: data.caller?.company_name || null,
      customer_email: data.caller?.email || null,
      eta: data.deliveryTimes?.[0]?.deliveryFromTime || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating shipment from PortPro:", error);
    return;
  }

  // Create initial event
  await supabase.from("load_events").insert({
    load_id: shipment.id,
    status,
    description: `Load created in PortPro: ${referenceNumber}`,
    portpro_event: true,
  });

  console.log(`Created shipment ${trackingNumber} from PortPro load ${referenceNumber}`);
}

/**
 * Handle load status updates
 */
async function handleLoadStatusUpdated(payload: WebhookPayload) {
  const supabase = getSupabase();
  const data = payload.data || payload.changedValues;
  const referenceNumber = payload.reference_number || data?.reference_number;

  if (!referenceNumber) return;

  const newStatus = data?.status || data?.newStatus;
  if (!newStatus) return;

  const mappedStatus = mapPortProStatus(newStatus);

  // Update shipment
  const { data: shipment, error } = await supabase
    .from("loads")
    .update({
      status: mappedStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("portpro_reference", referenceNumber)
    .select()
    .single();

  if (error) {
    console.error("Error updating load status:", error);
    return;
  }

  if (!shipment) {
    console.log(`No shipment found for reference ${referenceNumber}`);
    return;
  }

  // Create status update event
  const statusDescriptions: Record<string, string> = {
    booked: "Load booked and confirmed",
    at_port: "Container at port",
    in_transit: "Container dispatched and in transit",
    out_for_delivery: "Container dropped for delivery",
    delivered: "Load completed",
  };

  await supabase.from("load_events").insert({
    load_id: shipment.id,
    status: mappedStatus,
    description: statusDescriptions[mappedStatus] || `Status updated to ${newStatus}`,
    portpro_event: true,
  });

  console.log(`Updated shipment ${shipment.tracking_number} to ${mappedStatus}`);
}

/**
 * Handle load info/dates updates
 */
async function handleLoadInfoUpdated(payload: WebhookPayload) {
  const supabase = getSupabase();
  const data = payload.changedValues || payload.data;
  const referenceNumber = payload.reference_number;

  if (!referenceNumber || !data) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // Update ETA if delivery times changed
  if (data.deliveryTimes?.[0]?.deliveryFromTime) {
    updates.eta = data.deliveryTimes[0].deliveryFromTime;
  }

  // Update pickup time if changed
  if (data.pickupTimes?.[0]?.pickupFromTime) {
    updates.pickup_time = data.pickupTimes[0].pickupFromTime;
  }

  // Update container info if changed
  if (data.containerNo) updates.container_number = data.containerNo;
  if (data.containerSize) updates.container_size = data.containerSize;

  const { error } = await supabase
    .from("loads")
    .update(updates)
    .eq("portpro_reference", referenceNumber);

  if (error) {
    console.error("Error updating shipment info:", error);
  }
}

/**
 * Handle equipment updates
 */
async function handleEquipmentUpdated(payload: WebhookPayload) {
  const supabase = getSupabase();
  const data = payload.changedValues || payload.data;
  const referenceNumber = payload.reference_number;

  if (!referenceNumber || !data) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (data.containerNo) updates.container_number = data.containerNo;
  if (data.chassisNo) updates.chassis_number = data.chassisNo;
  if (data.sealNo) updates.seal_number = data.sealNo;

  const { error } = await supabase
    .from("loads")
    .update(updates)
    .eq("portpro_reference", referenceNumber);

  if (error) {
    console.error("Error updating equipment info:", error);
  }
}

/**
 * Handle document additions
 */
async function handleDocumentAdded(payload: WebhookPayload, docType: string) {
  const supabase = getSupabase();
  const data = payload.data;
  const referenceNumber = payload.reference_number || data?.reference_number;

  if (!referenceNumber) return;

  // Get shipment
  const { data: shipment } = await supabase
    .from("loads")
    .select("id")
    .eq("portpro_reference", referenceNumber)
    .single();

  if (!shipment) return;

  // Create event for document addition
  await supabase.from("load_events").insert({
    load_id: shipment.id,
    status: "document",
    description: `${docType} document added`,
    portpro_event: true,
  });

  // If it's a POD, mark shipment as delivered
  if (docType === "POD") {
    await supabase
      .from("loads")
      .update({ status: "delivered", updated_at: new Date().toISOString() })
      .eq("id", shipment.id);

    await supabase.from("load_events").insert({
      load_id: shipment.id,
      status: "delivered",
      description: "Proof of delivery received",
      portpro_event: true,
    });
  }
}

/**
 * Handle tender status changes
 */
async function handleTenderStatusChanged(payload: WebhookPayload) {
  const supabase = getSupabase();
  const data = payload.data;
  if (!data) return;

  const referenceNumber = data.loadReferenceNumber;
  const tenderStatus = data.status;

  console.log(`Tender ${data.tenderReferenceNumber} status: ${tenderStatus}`);

  // Get shipment and add event
  const { data: shipment } = await supabase
    .from("loads")
    .select("id")
    .eq("portpro_reference", referenceNumber)
    .single();

  if (shipment) {
    await supabase.from("load_events").insert({
      load_id: shipment.id,
      status: "tender",
      description: `Tender ${tenderStatus.toLowerCase()}`,
      portpro_event: true,
    });
  }
}

/**
 * Handle new customer creation
 */
async function handleCustomerCreated(payload: WebhookPayload) {
  const data = payload.data;
  if (!data) return;

  console.log("New PortPro customer created:", data);

  // Optionally create organization record
  // This could be used to auto-create customer accounts
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "portpro",
    timestamp: new Date().toISOString(),
  });
}
