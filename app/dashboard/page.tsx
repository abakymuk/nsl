import { currentUser } from "@clerk/nextjs/server";
import { StatsCard } from "@/components/dashboard/stats-card";
import { FileText, Truck, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await currentUser();
  const firstName = user?.firstName || "there";

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
          value={0}
          description="Awaiting response"
          icon={Clock}
        />
        <StatsCard
          title="Active Shipments"
          value={0}
          description="Currently in transit"
          icon={Truck}
        />
        <StatsCard
          title="Total Quotes"
          value={0}
          description="All time"
          icon={FileText}
        />
        <StatsCard
          title="Completed"
          value={0}
          description="Delivered shipments"
          icon={CheckCircle2}
        />
      </div>

      {/* Quick Actions */}
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
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No recent activity</p>
            <p className="text-xs mt-1">
              Your quotes and shipments will appear here
            </p>
          </div>
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
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No quotes yet</p>
          <p className="text-xs mt-1">
            Request a quote to get started
          </p>
          <Link
            href="/quote"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Request Quote
          </Link>
        </div>
      </div>
    </div>
  );
}
