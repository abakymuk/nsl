"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Timer,
  Loader2,
} from "lucide-react";

interface QuoteMetrics {
  summary: {
    total: number;
    pending: number;
    in_review: number;
    quoted: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  conversion: {
    quotedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    expiredCount: number;
    conversionRate: number;
    responseRate: number;
  };
  timing: {
    avgTimeToQuote: number | null;
    avgTimeToResponse: number | null;
  };
  recent: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: "primary" | "success" | "warning" | "destructive";
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold truncate">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuoteMetrics() {
  const [metrics, setMetrics] = useState<QuoteMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch("/api/admin/quotes/metrics");
        if (!response.ok) {
          throw new Error("Failed to fetch metrics");
        }
        const data = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {error || "No data available"}
      </div>
    );
  }

  const formatHours = (hours: number | null) => {
    if (hours === null) return "—";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversion.conversionRate}%`}
          subtitle={`${metrics.conversion.acceptedCount} accepted`}
          icon={TrendingUp}
          color="success"
        />
        <MetricCard
          title="Response Rate"
          value={`${metrics.conversion.responseRate}%`}
          subtitle="of quoted responded"
          icon={BarChart3}
          color="primary"
        />
        <MetricCard
          title="Avg Time to Quote"
          value={formatHours(metrics.timing.avgTimeToQuote)}
          subtitle="from submission"
          icon={Timer}
          color="warning"
        />
        <MetricCard
          title="Avg Response Time"
          value={formatHours(metrics.timing.avgTimeToResponse)}
          subtitle="customer decision"
          icon={Clock}
        />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatusBadge
          label="Pending"
          count={metrics.summary.pending}
          color="warning"
        />
        <StatusBadge
          label="In Review"
          count={metrics.summary.in_review}
          color="primary"
        />
        <StatusBadge
          label="Quoted"
          count={metrics.summary.quoted}
          color="primary"
        />
        <StatusBadge
          label="Accepted"
          count={metrics.summary.accepted}
          color="success"
          icon={CheckCircle}
        />
        <StatusBadge
          label="Rejected"
          count={metrics.summary.rejected}
          color="destructive"
          icon={XCircle}
        />
        <StatusBadge
          label="Expired"
          count={metrics.summary.expired}
          color="muted"
          icon={AlertCircle}
        />
        <StatusBadge
          label="Total"
          count={metrics.summary.total}
          color="default"
        />
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-medium mb-3">Recent Quote Requests</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{metrics.recent.last24h}</p>
            <p className="text-xs text-muted-foreground">Last 24h</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{metrics.recent.last7d}</p>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{metrics.recent.last30d}</p>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  count,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  color: "primary" | "success" | "warning" | "destructive" | "muted" | "default";
  icon?: React.ElementType;
}) {
  const colorClasses = {
    primary: "bg-primary/10 border-primary/20 text-primary",
    success: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
    destructive: "bg-destructive/10 border-destructive/20 text-destructive",
    muted: "bg-muted border-muted-foreground/20 text-muted-foreground",
    default: "bg-card border-border",
  };

  return (
    <div
      className={`rounded-lg border p-3 text-center ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-center gap-1">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="text-lg font-bold">{count}</span>
      </div>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}
