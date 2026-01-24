import { redirect } from "next/navigation";
import { cache, Suspense } from "react";
import { getUser, createUntypedAdminClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DashboardAnalyticsTracker } from "@/components/dashboard/analytics-tracker";
import { FileText, Truck, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: ReturnType<typeof createUntypedAdminClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createUntypedAdminClient();
  }
  return _supabase;
}

const getCustomerCompany = cache(async (email: string) => {
  const { data } = await getSupabase()
    .from("quotes")
    .select("company_name")
    .eq("email", email)
    .limit(1)
    .single();

  return data?.company_name || null;
});

const getCustomerStats = cache(async (email: string, companyName: string | null) => {
  const quoteFilter = companyName
    ? { column: "company_name", value: companyName }
    : { column: "email", value: email };

  const shipmentFilter = companyName
    ? { column: "customer_name", value: companyName }
    : { column: "customer_email", value: email };

  // Run all 4 queries in parallel
  const [
    { count: totalQuotes },
    { count: pendingQuotes },
    { count: activeShipments },
    { count: completedShipments },
  ] = await Promise.all([
    getSupabase().from("quotes").select("*", { count: "exact", head: true }).eq(quoteFilter.column, quoteFilter.value),
    getSupabase().from("quotes").select("*", { count: "exact", head: true }).eq(quoteFilter.column, quoteFilter.value).eq("status", "pending"),
    getSupabase().from("loads").select("*", { count: "exact", head: true }).eq(shipmentFilter.column, shipmentFilter.value).in("status", ["booked", "in_transit", "at_port", "out_for_delivery"]),
    getSupabase().from("loads").select("*", { count: "exact", head: true }).eq(shipmentFilter.column, shipmentFilter.value).eq("status", "delivered"),
  ]);

  return {
    totalQuotes: totalQuotes || 0,
    pendingQuotes: pendingQuotes || 0,
    activeShipments: activeShipments || 0,
    completedShipments: completedShipments || 0,
  };
});

const getRecentQuotes = cache(async (email: string, companyName: string | null) => {
  const filter = companyName
    ? { column: "company_name", value: companyName }
    : { column: "email", value: email };

  const { data } = await getSupabase()
    .from("quotes")
    .select("id, service_type, container_number, status, created_at")
    .eq(filter.column, filter.value)
    .order("created_at", { ascending: false })
    .limit(5);

  return data || [];
});

const getRecentActivity = cache(async (email: string, companyName: string | null) => {
  const quoteFilter = companyName
    ? { column: "company_name", value: companyName }
    : { column: "email", value: email };

  const shipmentFilter = companyName
    ? { column: "customer_name", value: companyName }
    : { column: "customer_email", value: email };

  // Run both queries in parallel
  const [{ data: quotes }, { data: shipments }] = await Promise.all([
    getSupabase()
      .from("quotes")
      .select("id, company_name, status, created_at")
      .eq(quoteFilter.column, quoteFilter.value)
      .order("created_at", { ascending: false })
      .limit(3),
    getSupabase()
      .from("loads")
      .select("id, container_number, status, updated_at")
      .eq(shipmentFilter.column, shipmentFilter.value)
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  const activity = [
    ...(quotes || []).map((q) => ({
      type: "quote" as const,
      id: q.id,
      title: `Quote: ${q.company_name || "Unknown"}`,
      status: q.status,
      date: q.created_at,
    })),
    ...(shipments || []).map((s) => ({
      type: "load" as const,
      id: s.id,
      title: `Shipment: ${s.container_number}`,
      status: s.status,
      date: s.updated_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return activity.slice(0, 5);
});

// Skeleton components
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 shadow-sm animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-8 w-16 bg-muted rounded mb-1" />
          <div className="h-3 w-20 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-2 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuotesSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="py-3 animate-pulse flex gap-4">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded-full" />
          <div className="h-4 w-20 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

// Async components
async function StatsSection({ email, companyName }: { email: string; companyName: string | null }) {
  const stats = await getCustomerStats(email, companyName);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        title="Total Quotes"
        value={stats.totalQuotes}
        description="All time"
        icon={FileText}
      />
      <StatsCard
        title="Completed"
        value={stats.completedShipments}
        description="Delivered loads"
        icon={CheckCircle2}
      />
    </div>
  );
}

async function RecentActivitySection({ email, companyName }: { email: string; companyName: string | null }) {
  const recentActivity = await getRecentActivity(email, companyName);

  if (recentActivity.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No recent activity</p>
        <p className="text-xs mt-1">
          Your quotes and shipments will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentActivity.map((item) => (
        <Link
          key={`${item.type}-${item.id}`}
          href={
            item.type === "quote"
              ? "/dashboard/quotes"
              : "/dashboard/loads"
          }
          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            {item.type === "quote" ? (
              <FileText className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Truck className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium truncate max-w-[150px]">
              {item.title}
            </span>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              item.status === "pending"
                ? "bg-warning/15 text-warning"
                : item.status === "delivered"
                ? "bg-success/15 text-success"
                : "bg-primary/15 text-primary"
            }`}
          >
            {item.status.replace(/_/g, " ")}
          </span>
        </Link>
      ))}
    </div>
  );
}

async function RecentQuotesSection({ email, companyName }: { email: string; companyName: string | null }) {
  const recentQuotes = await getRecentQuotes(email, companyName);

  if (recentQuotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No quotes yet</p>
        <p className="text-xs mt-1">Request a quote to get started</p>
        <Link
          href="/quote"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Request Quote
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b">
            <th className="pb-3 font-medium">Service</th>
            <th className="pb-3 font-medium">Container</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {recentQuotes.map((quote) => (
            <tr key={quote.id} className="text-sm">
              <td className="py-3">{quote.service_type}</td>
              <td className="py-3">
                <code className="bg-muted px-2 py-0.5 rounded text-xs">
                  {quote.container_number || "N/A"}
                </code>
              </td>
              <td className="py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
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
              </td>
              <td className="py-3 text-muted-foreground">
                {new Date(quote.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const email = user.email || "";
  const firstName = user.user_metadata?.full_name?.split(" ")[0] || email.split("@")[0];

  // Get company name first (needed for child components)
  const companyName = await getCustomerCompany(email);

  return (
    <div className="space-y-8">
      {/* Analytics tracking */}
      <DashboardAnalyticsTracker section="overview" />

      {/* Header - renders immediately */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your account activity.
        </p>
      </div>

      {/* Stats Grid - streams independently */}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection email={email} companyName={companyName} />
      </Suspense>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions - renders immediately */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/quote"
              className="group relative flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 px-4 py-6 text-primary-foreground font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-200"
            >
              <div className="rounded-full bg-white/20 p-3">
                <FileText className="h-6 w-6" />
              </div>
              <span className="text-sm">New Quote</span>
            </Link>
            <Link
              href="/track"
              className="group relative flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-accent to-accent/80 px-4 py-6 text-accent-foreground font-medium shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 hover:scale-[1.02] transition-all duration-200"
            >
              <div className="rounded-full bg-white/20 p-3">
                <Truck className="h-6 w-6" />
              </div>
              <span className="text-sm">Track Load</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity - streams independently */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold text-lg mb-4">Recent Activity</h2>
          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivitySection email={email} companyName={companyName} />
          </Suspense>
        </div>
      </div>

      {/* Recent Quotes - streams independently */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Recent Quotes</h2>
          <Link
            href="/dashboard/quotes"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <Suspense fallback={<QuotesSkeleton />}>
          <RecentQuotesSection email={email} companyName={companyName} />
        </Suspense>
      </div>
    </div>
  );
}
