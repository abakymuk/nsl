import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Package,
  Calendar,
  User,
  Mail,
  Phone,
  Ship,
  FileText,
  Truck,
  Scale,
  RotateCcw,
  Navigation,
} from "lucide-react";
import { ShipmentActions } from "./shipment-actions";
import { ShipmentTimeline } from "./shipment-timeline";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getShipment(id: string) {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function getShipmentEvents(shipmentId: string) {
  const { data, error } = await supabase
    .from("shipment_events")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return data || [];
}

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await getShipment(id);

  if (!shipment) {
    notFound();
  }

  const events = await getShipmentEvents(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/shipments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shipments
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono">{shipment.tracking_number}</h1>
          <p className="text-muted-foreground mt-1">
            Container: {shipment.container_number}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            shipment.status === "delivered"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : shipment.status === "in_transit"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              : shipment.status === "at_port"
              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
              : shipment.status === "out_for_delivery"
              ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
              : shipment.status === "cancelled"
              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {shipment.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route - only show if origin, destination, or return_location exists */}
          {(shipment.origin || shipment.destination || shipment.return_location) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Route Information</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {shipment.origin && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <p className="text-xs text-muted-foreground font-medium">Pick Up Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{shipment.origin}</p>
                  </div>
                )}
                {shipment.destination && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <p className="text-xs text-muted-foreground font-medium">Delivery Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{shipment.destination}</p>
                  </div>
                )}
                {shipment.return_location && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw className="h-4 w-4 text-orange-500" />
                      <p className="text-xs text-muted-foreground font-medium">Return Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{shipment.return_location}</p>
                  </div>
                )}
              </div>
              {shipment.total_miles && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>Total Distance: <strong className="text-foreground">{shipment.total_miles.toFixed(2)} miles</strong></span>
                </div>
              )}
            </div>
          )}

          {/* Container & Equipment */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Container & Equipment</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Container #</p>
                  <code className="font-mono font-medium">{shipment.container_number}</code>
                </div>
              </div>
              {(shipment.container_size || shipment.container_type) && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Size / Type</p>
                    <p className="font-medium">
                      {[shipment.container_size, shipment.container_type].filter(Boolean).join(" ")}
                    </p>
                  </div>
                </div>
              )}
              {shipment.chassis_number && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Chassis #</p>
                    <code className="font-mono font-medium">{shipment.chassis_number}</code>
                  </div>
                </div>
              )}
              {shipment.seal_number && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Seal #</p>
                    <code className="font-mono font-medium">{shipment.seal_number}</code>
                  </div>
                </div>
              )}
              {shipment.weight && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weight</p>
                    <p className="font-medium">{shipment.weight.toLocaleString()} LBS</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking & Shipping Info - only show if any field exists */}
          {(shipment.booking_number || shipment.shipping_line || shipment.commodity) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Booking & Shipping</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shipment.booking_number && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Booking #</p>
                      <code className="font-mono font-medium">{shipment.booking_number}</code>
                    </div>
                  </div>
                )}
                {shipment.shipping_line && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Ship className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Shipping Line (SSL)</p>
                      <p className="font-medium">{shipment.shipping_line}</p>
                    </div>
                  </div>
                )}
                {shipment.commodity && (
                  <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commodity</p>
                      <p className="font-medium">{shipment.commodity}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Info */}
          {(shipment.customer_name || shipment.customer_email || shipment.customer_phone) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Customer Information</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shipment.customer_name && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-medium">{shipment.customer_name}</p>
                    </div>
                  </div>
                )}
                {shipment.customer_email && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${shipment.customer_email}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {shipment.customer_email}
                      </a>
                    </div>
                  </div>
                )}
                {shipment.customer_phone && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a
                        href={`tel:${shipment.customer_phone}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {shipment.customer_phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Important Dates</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 shrink-0">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-medium">
                    {shipment.eta
                      ? new Date(shipment.eta).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Not set"}
                  </p>
                </div>
              </div>
              {shipment.last_free_day && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-2 shrink-0">
                    <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Free Day</p>
                    <p className="font-medium text-orange-600 dark:text-orange-400">
                      {new Date(shipment.last_free_day).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {shipment.pickup_time && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup Time</p>
                    <p className="font-medium">
                      {new Date(shipment.pickup_time).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Tracking History</h2>
            <ShipmentTimeline events={events} />
          </div>

          {/* Notes */}
          {shipment.notes && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Notes</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {shipment.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <ShipmentActions shipment={shipment} />
        </div>
      </div>
    </div>
  );
}
