import { redirect } from "next/navigation";
import { getUser, createUntypedAdminClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/dashboard/stats-card";
import { FileText, Truck, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const supabase = createUntypedAdminClient();

async function getCustomerCompany(email: string) {
  const { data } = await supabase
    .from("quotes")
    .select("company_name")
    .eq("email", email)
    .limit(1)
    .single();

  return data?.company_name || null;
}

async function getCustomerStats(email: string, companyName: string | null) {
  const quoteFilter = companyName
    ? { column: "company_name", value: companyName }
    : { column: "email", value: email };

  const { count: totalQuotes } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq(quoteFilter.column, quoteFilter.value);

  const { count: pendingQuotes } = await supabase
    .from("quotes")
    .select("*", { count: "exact", head: true })
    .eq(quoteFilter.column, quoteFilter.value)
    .eq("status", "pending");

  const shipmentFilter = companyName
    ? { column: "customer_name", value: companyName }
    : { column: "customer_email", value: email };

  const { count: activeShipments } = await supabase
    .from("shipments")
    .select("*", { count: "exact", head: true })
    .eq(shipmentFilter.column, shipmentFilter.value)
    .in("status", ["booked", "in_transit", "at_port", "out_for_delivery"]);

  const { count: completedShipments } = await supabase
    .from("shipments")
    .select("*", { count: "exact", head: true })
    .eq(shipmentFilter.column, shipmentFilter.value)
    .eq("status", "delivered");

  return {
    totalQuotes: totalQuotes || 0,
    pendingQuotes: pendingQuotes || 0,
    activeShipments: activeShipments || 0,
    completedShipments: completedShipments || 0,
  };
}

async function getRecentQuotes(email: string, companyName: string | null) {
  const filter = companyName
    ? { column: "company_name", value: companyName }
    : { column: "email", value: email };

  const { data } = await supabase
    .from("quotes")
    .select("*")
    .eq(filter.column, filter.value)
    .order("created_at", { ascending: false })
    .limit(5);

  return data || [];
}

async function getRecentActivity(email: string, companyName: string | null) {
  const quoteFilter = companyName
    ? { column: "company_name", value: companyName }
    : { column: "email", value: email };

  const shipmentFilter = companyName
    ? { column: "customer_name", value: companyName }
    : { column: "customer_email", value: email };

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, company_name, status, created_at")
    .eq(quoteFilter.column, quoteFilter.value)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: shipments } = await supabase
    .from("shipments")
    .select("id, container_number, status, updated_at")
    .eq(shipmentFilter.column, shipmentFilter.value)
    .order("updated_at", { ascending: false })
    .limit(3);

  const activity = [
    ...(quotes || []).map((q) => ({
      type: "quote",
      id: q.id,
      title: `Quote: ${q.company_name || "Unknown"}`,
      status: q.status,
      date: q.created_at,
    })),
    ...(shipments || []).map((s) => ({
      type: "shipment",
      id: s.id,
      title: `Shipment: ${s.container_number}`,
      status: s.status,
      date: s.updated_at,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return activity.slice(0, 5);
}

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const email = user.email || "";
  const firstName = user.user_metadata?.full_name?.split(" ")[0] || email.split("@")[0];

  const companyName = await getCustomerCompany(email);
  const stats = await getCustomerStats(email, companyName);
  const recentQuotes = await getRecentQuotes(email, companyName);
  const recentActivity = await getRecentActivity(email, companyName);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {firstName}!</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your account activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          title="Total Quotes"
          value={stats.totalQuotes}
          description="All time"
          icon={FileText}
        />
        <StatsCard
          title="Completed"
          value={stats.completedShipments}
          description="Delivered shipments"
          icon={CheckCircle2}
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/quote"
              className="flex items-center justify-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4" />
              New Quote
            </Link>
            <Link
              href="/track"
              className="flex items-center justify-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Truck className="h-4 w-4" />
              Track Shipment
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-semibold text-lg mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No recent activity</p>
              <p className="text-xs mt-1">
                Your quotes and shipments will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={
                    item.type === "quote"
                      ? "/dashboard/quotes"
                      : "/dashboard/shipments"
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
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        : item.status === "delivered"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}
                  >
                    {item.status.replace(/_/g, " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Quotes */}
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
        {recentQuotes.length === 0 ? (
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
        ) : (
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
                {recentQuotes.map((quote: Record<string, unknown>) => (
                  <tr key={quote.id as string} className="text-sm">
                    <td className="py-3">{quote.service_type as string}</td>
                    <td className="py-3">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {(quote.container_number as string) || "N/A"}
                      </code>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          quote.status === "pending"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : quote.status === "quoted"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : quote.status === "accepted"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {quote.status as string}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {new Date(quote.created_at as string).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
