import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Suspense } from "react";
import { Truck, ChevronRight, RefreshCw } from "lucide-react";
import { LoadSearch } from "@/components/admin/loads/load-search";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getLoads(status?: string, search?: string) {
  // Only select columns needed for the list view
  let query = supabase
    .from("loads")
    .select("id, tracking_number, container_number, origin, destination, status, eta, created_at")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    // Search across tracking_number, container_number, origin, destination
    query = query.or(
      `tracking_number.ilike.%${search}%,container_number.ilike.%${search}%,origin.ilike.%${search}%,destination.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching shipments:", error);
    return [];
  }

  return data || [];
}

export default async function AdminLoadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const loads = await getLoads(status, q);

  const statuses = [
    "all",
    "booked",
    "at_port",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shipments</h1>
          <p className="text-muted-foreground mt-1">
            View shipments synced from PortPro
          </p>
        </div>
        <Link
          href="/admin/sync"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Sync from PortPro
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Suspense fallback={<div className="h-10 w-full max-w-sm bg-muted animate-pulse rounded-lg" />}>
          <LoadSearch />
        </Suspense>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const params = new URLSearchParams();
            if (s !== "all") params.set("status", s);
            if (q) params.set("q", q);
            const href = params.toString() ? `/admin/loads?${params}` : "/admin/loads";
            return (
              <Link
                key={s}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  (status || "all") === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Shipments Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tracking #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Origin → Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  ETA
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      No loads found
                    </p>
                    <Link
                      href="/admin/sync"
                      className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Sync from PortPro
                    </Link>
                  </td>
                </tr>
              ) : (
                loads.map((shipment: any) => (
                  <tr key={shipment.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <code className="font-mono font-medium text-sm">
                        {shipment.tracking_number}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {shipment.container_number || "N/A"}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">
                        {shipment.origin && shipment.destination
                          ? `${shipment.origin} → ${shipment.destination}`
                          : shipment.origin || shipment.destination || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          shipment.status === "delivered"
                            ? "bg-success/15 text-success"
                            : shipment.status === "in_transit"
                            ? "bg-primary/15 text-primary"
                            : shipment.status === "at_port"
                            ? "bg-chart-4/15 text-chart-4"
                            : shipment.status === "out_for_delivery"
                            ? "bg-accent/15 text-accent"
                            : shipment.status === "cancelled"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        {shipment.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">
                        {shipment.eta
                          ? new Date(shipment.eta).toLocaleDateString()
                          : "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/loads/${shipment.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
