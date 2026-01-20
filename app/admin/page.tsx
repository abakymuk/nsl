import { createClient } from "@supabase/supabase-js";
import { cache, Suspense } from "react";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  FileText,
  Truck,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const getStats = cache(async () => {
  const now = new Date();
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));

  // Run all 6 queries in parallel
  const [
    { count: totalQuotes },
    { count: pendingQuotes },
    { count: todayQuotes },
    { count: totalShipments },
    { count: activeShipments },
    { count: completedShipments },
  ] = await Promise.all([
    supabase.from("quotes").select("*", { count: "exact", head: true }),
    supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("quotes").select("*", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()),
    supabase.from("loads").select("*", { count: "exact", head: true }),
    supabase.from("loads").select("*", { count: "exact", head: true }).in("status", ["booked", "in_transit", "at_port", "out_for_delivery"]),
    supabase.from("loads").select("*", { count: "exact", head: true }).eq("status", "delivered"),
  ]);

  return {
    totalQuotes: totalQuotes || 0,
    pendingQuotes: pendingQuotes || 0,
    todayQuotes: todayQuotes || 0,
    totalShipments: totalShipments || 0,
    activeShipments: activeShipments || 0,
    completedShipments: completedShipments || 0,
  };
});

const getRecentQuotes = cache(async () => {
  const { data } = await supabase
    .from("quotes")
    .select("id, company_name, container_number, service_type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return data || [];
});

const getActiveShipments = cache(async () => {
  const { data } = await supabase
    .from("loads")
    .select("id, tracking_number, container_number, status, eta, updated_at")
    .in("status", ["booked", "in_transit", "at_port", "out_for_delivery"])
    .order("updated_at", { ascending: false })
    .limit(5);

  return data || [];
});

// Skeleton components for loading states
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 shadow-sm animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-8 w-16 bg-muted rounded mb-1" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-4 animate-pulse">
          <div className="flex justify-between">
            <div>
              <div className="h-4 w-32 bg-muted rounded mb-2" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
            <div className="text-right">
              <div className="h-5 w-16 bg-muted rounded mb-1" />
              <div className="h-3 w-12 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Async component for stats
async function StatsSection() {
  const stats = await getStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatsCard
        title="Pending Quotes"
        value={stats.pendingQuotes}
        description="Awaiting response"
        icon={Clock}
      />
      <StatsCard
        title="Active Loads"
        value={stats.activeShipments}
        description="Currently in transit"
        icon={Truck}
      />
      <StatsCard
        title="Today's Quotes"
        value={stats.todayQuotes}
        description="New requests today"
        icon={FileText}
      />
      <StatsCard
        title="Total Quotes"
        value={stats.totalQuotes}
        description="All time"
        icon={FileText}
      />
      <StatsCard
        title="Completed Loads"
        value={stats.completedShipments}
        description="Successfully delivered"
        icon={CheckCircle2}
      />
      <StatsCard
        title="Total Loads"
        value={stats.totalShipments}
        description="All time"
        icon={Truck}
      />
    </div>
  );
}

// Async component for recent quotes
async function RecentQuotesSection() {
  const recentQuotes = await getRecentQuotes();

  return (
    <div className="divide-y">
      {recentQuotes.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No quotes yet
        </p>
      ) : (
        recentQuotes.map((quote: { id: string; company_name: string; container_number: string | null; service_type: string; status: string; created_at: string }) => (
          <Link
            key={quote.id}
            href={`/admin/quotes/${quote.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="font-medium text-sm">{quote.company_name}</p>
              <p className="text-xs text-muted-foreground">
                {quote.container_number || "No container"} &bull;{" "}
                {quote.service_type}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  quote.status === "pending"
                    ? "bg-warning/15 text-warning"
                    : quote.status === "quoted"
                    ? "bg-primary/15 text-primary"
                    : quote.status === "accepted"
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {quote.status}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(quote.created_at).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

// Async component for active shipments
async function ActiveShipmentsSection() {
  const activeShipments = await getActiveShipments();

  return (
    <div className="divide-y">
      {activeShipments.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          No active shipments
        </p>
      ) : (
        activeShipments.map((shipment: { id: string; tracking_number: string; container_number: string; status: string; eta: string | null; updated_at: string }) => (
          <Link
            key={shipment.id}
            href={`/admin/loads/${shipment.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div>
              <p className="font-medium text-sm font-mono">
                {shipment.tracking_number}
              </p>
              <p className="text-xs text-muted-foreground">
                {shipment.container_number}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  shipment.status === "in_transit"
                    ? "bg-primary/15 text-primary"
                    : shipment.status === "at_port"
                    ? "bg-chart-4/15 text-chart-4"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {shipment.status.replace(/_/g, " ")}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {shipment.eta
                  ? `ETA: ${new Date(shipment.eta).toLocaleDateString()}`
                  : "No ETA"}
              </p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage quotes, shipments, and customer operations
        </p>
      </div>

      {/* Stats Grid - streams independently */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      {/* Recent Activity - streams independently */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Quotes */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="font-semibold">Recent Quotes</h2>
            <Link
              href="/admin/quotes"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <Suspense fallback={<ListSkeleton />}>
            <RecentQuotesSection />
          </Suspense>
        </div>

        {/* Active Loads */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="font-semibold">Active Loads</h2>
            <Link
              href="/admin/loads"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <Suspense fallback={<ListSkeleton />}>
            <ActiveShipmentsSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
