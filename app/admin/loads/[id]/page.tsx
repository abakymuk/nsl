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
import { LoadActions } from "./load-actions";
import { LoadTimeline } from "./load-timeline";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getLoad(id: string) {
  const { data, error } = await supabase
    .from("loads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function getLoadEvents(loadId: string) {
  const { data, error } = await supabase
    .from("load_events")
    .select("*")
    .eq("load_id", loadId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return data || [];
}

export default async function LoadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const load = await getLoad(id);

  if (!load) {
    notFound();
  }

  const events = await getLoadEvents(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/loads"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Loads
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono">{load.tracking_number}</h1>
          <p className="text-muted-foreground mt-1">
            Container: {load.container_number}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            load.status === "delivered"
              ? "bg-success/15 text-success"
              : load.status === "in_transit"
              ? "bg-primary/15 text-primary"
              : load.status === "at_port"
              ? "bg-chart-4/15 text-chart-4"
              : load.status === "out_for_delivery"
              ? "bg-accent/15 text-accent"
              : load.status === "cancelled"
              ? "bg-destructive/15 text-destructive"
              : "bg-warning/15 text-warning"
          }`}
        >
          {load.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Route - only show if origin, destination, or return_location exists */}
          {(load.origin || load.destination || load.return_location) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Route Information</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {load.origin && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <p className="text-xs text-muted-foreground font-medium">Pick Up Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{load.origin}</p>
                  </div>
                )}
                {load.destination && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <p className="text-xs text-muted-foreground font-medium">Delivery Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{load.destination}</p>
                  </div>
                )}
                {load.return_location && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw className="h-4 w-4 text-orange-500" />
                      <p className="text-xs text-muted-foreground font-medium">Return Location</p>
                    </div>
                    <p className="text-sm whitespace-pre-line">{load.return_location}</p>
                  </div>
                )}
              </div>
              {load.total_miles && (
                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                  <Navigation className="h-4 w-4" />
                  <span>Total Distance: <strong className="text-foreground">{load.total_miles.toFixed(2)} miles</strong></span>
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
                  <code className="font-mono font-medium">{load.container_number}</code>
                </div>
              </div>
              {(load.container_size || load.container_type) && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Size / Type</p>
                    <p className="font-medium">
                      {[load.container_size, load.container_type].filter(Boolean).join(" ")}
                    </p>
                  </div>
                </div>
              )}
              {load.chassis_number && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Chassis #</p>
                    <code className="font-mono font-medium">{load.chassis_number}</code>
                  </div>
                </div>
              )}
              {load.seal_number && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Seal #</p>
                    <code className="font-mono font-medium">{load.seal_number}</code>
                  </div>
                </div>
              )}
              {load.weight && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Weight</p>
                    <p className="font-medium">{load.weight.toLocaleString()} LBS</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Booking & Shipping Info - only show if any field exists */}
          {(load.booking_number || load.shipping_line || load.commodity) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Booking & Shipping</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {load.booking_number && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Booking #</p>
                      <code className="font-mono font-medium">{load.booking_number}</code>
                    </div>
                  </div>
                )}
                {load.shipping_line && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Ship className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Shipping Line (SSL)</p>
                      <p className="font-medium">{load.shipping_line}</p>
                    </div>
                  </div>
                )}
                {load.commodity && (
                  <div className="flex items-start gap-3 sm:col-span-2 lg:col-span-1">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commodity</p>
                      <p className="font-medium">{load.commodity}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Info */}
          {(load.customer_name || load.customer_email || load.customer_phone) && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Customer Information</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {load.customer_name && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-medium">{load.customer_name}</p>
                    </div>
                  </div>
                )}
                {load.customer_email && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${load.customer_email}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {load.customer_email}
                      </a>
                    </div>
                  </div>
                )}
                {load.customer_phone && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a
                        href={`tel:${load.customer_phone}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {load.customer_phone}
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
                    {load.eta
                      ? new Date(load.eta).toLocaleDateString("en-US", {
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
              {load.last_free_day && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-orange-100 p-2 shrink-0">
                    <Calendar className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Free Day</p>
                    <p className="font-medium text-orange-600">
                      {new Date(load.last_free_day).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
              {load.pickup_time && (
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pickup Time</p>
                    <p className="font-medium">
                      {new Date(load.pickup_time).toLocaleDateString("en-US", {
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
            <LoadTimeline events={events} />
          </div>

          {/* Notes */}
          {load.notes && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Notes</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {load.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <LoadActions load={load} />
        </div>
      </div>
    </div>
  );
}
