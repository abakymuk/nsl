"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Search,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { QuoteQueueItem, QuoteQueueResponse } from "@/app/api/admin/quotes/route";
import { SLAStatus } from "@/lib/quotes/priority";
import { getQuoteStatusConfig, formatStatusLabel } from "@/lib/status-config";

interface QuoteQueueProps {
  initialData?: QuoteQueueResponse;
}

const STATUS_OPTIONS = [
  { value: "pending,in_review,quoted", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "quoted", label: "Quoted" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];

const SLA_OPTIONS = [
  { value: "", label: "All SLA" },
  { value: "overdue", label: "Overdue" },
  { value: "warning", label: "Due Soon" },
  { value: "ok", label: "On Track" },
];

function SLABadge({ status }: { status: SLAStatus }) {
  const config = {
    overdue: {
      icon: AlertTriangle,
      label: "Overdue",
      className: "bg-destructive/15 text-destructive border-destructive/30",
    },
    warning: {
      icon: Clock,
      label: "Due Soon",
      className: "bg-warning/15 text-warning border-warning/30",
    },
    ok: {
      icon: CheckCircle,
      label: "On Track",
      className: "bg-success/15 text-success border-success/30",
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function PriorityBadge({ score }: { score: number }) {
  let className = "bg-muted text-muted-foreground";
  let label = "Low";

  if (score >= 70) {
    className = "bg-destructive/15 text-destructive";
    label = "High";
  } else if (score >= 40) {
    className = "bg-warning/15 text-warning";
    label = "Medium";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
      title={`Priority Score: ${score}`}
    >
      {label} ({score})
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = getQuoteStatusConfig(status);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.badgeClass}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

function formatTimePending(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${Math.round(hours)}h ago`;
  } else {
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }
}

export function QuoteQueue({ initialData }: QuoteQueueProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<QuoteQueueResponse | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Filter state from URL
  const status = searchParams.get("status") || "pending,in_review,quoted";
  const slaStatus = searchParams.get("sla_status") || "";
  const search = searchParams.get("search") || "";
  const assigneeId = searchParams.get("assignee_id") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (slaStatus) params.set("sla_status", slaStatus);
      if (search) params.set("search", search);
      if (assigneeId) params.set("assignee_id", assigneeId);
      params.set("page", page.toString());
      params.set("sort_by", "priority");
      params.set("sort_order", "desc");

      const response = await fetch(`/api/admin/quotes?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch quotes");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [status, slaStatus, search, assigneeId, page]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchQuotes, 30000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    // Reset to page 1 when filters change
    if (!("page" in updates)) {
      params.set("page", "1");
    }
    router.push(`/admin/quotes?${params.toString()}`);
  };

  const handleClaim = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee_id: "self" }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to claim quote");
        return;
      }

      fetchQuotes(); // Refresh the list
    } catch {
      alert("Failed to claim quote");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => updateFilters({ status: e.target.value })}
          className="px-3 py-2 rounded-lg border bg-background text-sm"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* SLA Filter */}
        <select
          value={slaStatus}
          onChange={(e) => updateFilters({ sla_status: e.target.value })}
          className="px-3 py-2 rounded-lg border bg-background text-sm"
        >
          {SLA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeId}
          onChange={(e) => updateFilters({ assignee_id: e.target.value })}
          className="px-3 py-2 rounded-lg border bg-background text-sm"
        >
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {/* TODO: Add list of team members */}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search company, email, container..."
            value={search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm"
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchQuotes}
          disabled={loading}
          className="p-2 rounded-lg border hover:bg-muted transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Quotes Table */}
      {data && (
        <>
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      SLA
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Container
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.quotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-4 text-sm text-muted-foreground">
                          No quotes found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    data.quotes.map((quote: QuoteQueueItem) => (
                      <tr
                        key={quote.id}
                        className={`hover:bg-muted/50 transition-colors ${
                          quote.priority.slaStatus === "overdue"
                            ? "bg-destructive/5"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <PriorityBadge score={quote.priority.score} />
                        </td>
                        <td className="px-4 py-3">
                          <SLABadge status={quote.priority.slaStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm">{quote.company_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {quote.contact_name}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                            {quote.container_number || "TBD"}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={quote.lifecycle_status || quote.status} />
                        </td>
                        <td className="px-4 py-3">
                          {quote.assignee ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {quote.assignee.full_name || quote.assignee.email}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleClaim(quote.id)}
                              className="text-xs text-primary hover:underline"
                            >
                              Claim
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-muted-foreground">
                            {formatTimePending(quote.priority.hoursPending)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/quotes/${quote.id}`}
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

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(data.page - 1) * data.limit + 1} to{" "}
                {Math.min(data.page * data.limit, data.total)} of {data.total} quotes
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => updateFilters({ page: String(data.page - 1) })}
                  disabled={data.page === 1}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => updateFilters({ page: String(data.page + 1) })}
                  disabled={data.page === data.totalPages}
                  className="px-3 py-1 rounded border text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
