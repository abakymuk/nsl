"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeSyncStatus } from "@/lib/hooks/use-realtime-loads";

interface SyncMetrics {
  webhooksLast24h: {
    total: number;
    failed: number;
    rate: number;
  };
  dlq: {
    count: number;
    maxRetriesReached: number;
  };
  lastReconciliation: {
    time: string | null;
    discrepancies: number;
    status: string | null;
  };
  health: "healthy" | "degraded" | "critical";
  issues: string[];
}

interface DLQItem {
  id: string;
  eventType: string;
  error: string;
  attempts: number;
  firstFailedAt: string;
  lastAttempt: string;
}

export default function SyncHealthPage() {
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);
  const [dlqItems, setDlqItems] = useState<DLQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const { isConnected } = useRealtimeSyncStatus(() => {
    // Auto-refresh on sync status changes
    fetchMetrics();
  });

  const fetchMetrics = async () => {
    try {
      const [metricsRes, dlqRes] = await Promise.all([
        fetch("/api/admin/sync-health"),
        fetch("/api/admin/dlq"),
      ]);

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      if (dlqRes.ok) {
        const data = await dlqRes.json();
        setDlqItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const retryDLQItem = async (id: string) => {
    setRetrying(id);
    try {
      const res = await fetch(`/api/admin/dlq/${id}/retry`, { method: "POST" });
      if (res.ok) {
        fetchMetrics();
      }
    } catch (error) {
      console.error("Failed to retry:", error);
    } finally {
      setRetrying(null);
    }
  };

  const removeDLQItem = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/dlq/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDlqItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (error) {
      console.error("Failed to remove:", error);
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Activity className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "bg-green-500/10 border-green-500/20";
      case "degraded":
        return "bg-yellow-500/10 border-yellow-500/20";
      case "critical":
        return "bg-red-500/10 border-red-500/20";
      default:
        return "bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sync Health</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <div className="animate-pulse grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sync Health</h1>
          <p className="text-muted-foreground">
            PortPro synchronization status and monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            {isConnected ? "Real-time connected" : "Disconnected"}
          </div>
          <Button variant="outline" onClick={fetchMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status Card */}
      {metrics && (
        <Card className={`border-2 ${getHealthColor(metrics.health)}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              {getHealthIcon(metrics.health)}
              <div>
                <h2 className="text-2xl font-bold capitalize">{metrics.health}</h2>
                {metrics.issues.length > 0 ? (
                  <ul className="text-sm text-muted-foreground mt-1">
                    {metrics.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    All systems operational
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Webhooks (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.webhooksLast24h.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.webhooksLast24h.failed || 0} failed (
              {metrics?.webhooksLast24h.rate || 0}% failure rate)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Dead Letter Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.dlq.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.dlq.maxRetriesReached || 0} at max retries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.lastReconciliation.status === "completed"
                ? metrics.lastReconciliation.discrepancies
                : "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.lastReconciliation.time
                ? `${new Date(metrics.lastReconciliation.time).toLocaleString()}`
                : "Never run"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* DLQ Items */}
      <Card>
        <CardHeader>
          <CardTitle>Failed Webhooks (DLQ)</CardTitle>
          <CardDescription>
            Webhooks that failed processing and are queued for retry
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dlqItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No failed webhooks</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dlqItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {item.eventType}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-500">
                        Attempt {item.attempts}/5
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {item.error}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      First failed: {new Date(item.firstFailedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => retryDLQItem(item.id)}
                      disabled={retrying === item.id}
                    >
                      {retrying === item.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeDLQItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Link href="/admin/sync">
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Manual Sync
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={async () => {
              await fetch("/api/admin/sync-portpro", { method: "POST" });
              fetchMetrics();
            }}
          >
            <Database className="h-4 w-4 mr-2" />
            Trigger Reconciliation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
