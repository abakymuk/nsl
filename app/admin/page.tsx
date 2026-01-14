import { createClient } from "@supabase/supabase-js";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  FileText,
  Truck,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.setHours(0, 0, 0, 0));

  // Get quote stats
  const { count: totalQuotes } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true });

  const { count: pendingQuotes } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: todayQuotes } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfToday.toISOString());

  // Get shipment stats
  const { count: totalShipments } = await supabase
    .from("shipments")
    .select("*", { count: "exact", head: true });

  const { count: activeShipments } = await supabase
    .from("shipments")
    .select("*", { count: "exact", head: true })
    .in("status", ["booked", "in_transit", "at_port", "out_for_delivery"]);

  const { count: completedShipments } = await supabase
    .from("shipments")
    .select("*", { count: "exact", head: true })
    .eq("status", "delivered");

  return {
    totalQuotes: totalQuotes || 0,
    pendingQuotes: pendingQuotes || 0,
    todayQuotes: todayQuotes || 0,
    totalShipments: totalShipments || 0,
    activeShipments: activeShipments || 0,
    completedShipments: completedShipments || 0,
  };
}

async function getRecentQuotes() {
  const { data } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return data || [];
}

async function getActiveShipments() {
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .in("status", ["booked", "in_transit", "at_port", "out_for_delivery"])
    .order("updated_at", { ascending: false })
    .limit(5);

  return data || [];
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const recentQuotes = await getRecentQuotes();
  const activeShipments = await getActiveShipments();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage quotes, shipments, and customer operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Pending Quotes"
          value={stats.pendingQuotes}
          description="Awaiting response"
          icon={Clock}
        />
        <StatsCard
          title="Active Shipments"
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
          title="Completed Shipments"
          value={stats.completedShipments}
          description="Successfully delivered"
          icon={CheckCircle2}
        />
        <StatsCard
          title="Total Shipments"
          value={stats.totalShipments}
          description="All time"
          icon={Truck}
        />
      </div>

      {/* Recent Activity */}
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
          <div className="divide-y">
            {recentQuotes.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No quotes yet
              </p>
            ) : (
              recentQuotes.map((quote: any) => (
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
        </div>

        {/* Active Shipments */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="font-semibold">Active Shipments</h2>
            <Link
              href="/admin/shipments"
              className="text-sm text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="divide-y">
            {activeShipments.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No active shipments
              </p>
            ) : (
              activeShipments.map((shipment: any) => (
                <Link
                  key={shipment.id}
                  href={`/admin/shipments/${shipment.id}`}
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
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/quotes?status=pending"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-warning bg-warning/10 text-warning hover:bg-warning/20 transition-colors text-sm font-medium"
          >
            <Clock className="h-4 w-4" />
            Review Pending Quotes
          </Link>
          <Link
            href="/admin/shipments/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Truck className="h-4 w-4" />
            Create New Shipment
          </Link>
          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
          >
            <DollarSign className="h-4 w-4" />
            View Analytics
          </Link>
        </div>
      </div>
    </div>
  );
}
