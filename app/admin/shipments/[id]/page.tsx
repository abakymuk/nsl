import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Package, Calendar, User, Mail } from "lucide-react";
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
          {/* Route */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Route Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">Origin</p>
                </div>
                <p className="font-medium">{shipment.origin || "N/A"}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <p className="text-xs text-muted-foreground">Destination</p>
                </div>
                <p className="font-medium">{shipment.destination || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Shipment Details */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Shipment Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Container</p>
                  <code className="font-mono font-medium">{shipment.container_number}</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-medium">
                    {shipment.eta
                      ? new Date(shipment.eta).toLocaleString()
                      : "Not set"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{shipment.customer_name || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${shipment.customer_email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {shipment.customer_email || "N/A"}
                  </a>
                </div>
              </div>
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
