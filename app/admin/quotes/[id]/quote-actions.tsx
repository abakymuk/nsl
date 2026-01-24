"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  CheckCircle,
  XCircle,
  Truck,
  Loader2,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  UserPlus
} from "lucide-react";
import { PricingEditor } from "@/components/admin/pricing-editor";
import { PricingBreakdown, QuoteStatus } from "@/types/database";

interface QuoteActionsProps {
  quote: {
    id: string;
    status: string;
    lifecycle_status?: QuoteStatus;
    quoted_price?: number;
    pricing_breakdown?: PricingBreakdown | null;
    email: string;
    company_name: string;
    expires_at?: string;
    assignee_id?: string;
    assignee?: {
      id: string;
      full_name: string | null;
      email: string;
    } | null;
  };
  currentUserId?: string;
}

export function QuoteActions({ quote, currentUserId }: QuoteActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pricing, setPricing] = useState<PricingBreakdown | null>(
    quote.pricing_breakdown || null
  );
  const [validityDays, setValidityDays] = useState(7);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const status = quote.lifecycle_status || quote.status;

  const handlePricingChange = useCallback((breakdown: PricingBreakdown) => {
    setPricing(breakdown);
  }, []);

  async function claimQuote() {
    setClaiming(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignee_id: "self" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to claim quote");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim quote");
    } finally {
      setClaiming(false);
    }
  }

  async function sendQuote() {
    if (!pricing || pricing.total <= 0) {
      setError("Please enter pricing details");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validityDays);

      const response = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "quoted",
          quoted_price: pricing.total,
          pricing_breakdown: pricing,
          expires_at: expiresAt.toISOString(),
          quote_notes: notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send quote");
      }

      // Store accept URL if returned
      if (data.acceptUrl) {
        setAcceptUrl(data.acceptUrl);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quote");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus: QuoteStatus) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update quote");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quote");
    } finally {
      setLoading(false);
    }
  }

  async function copyAcceptUrl() {
    if (acceptUrl) {
      await navigator.clipboard.writeText(acceptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const canEdit = ["pending", "in_review", "quoted"].includes(status);
  const isAssignedToMe = quote.assignee_id === currentUserId;
  const needsClaim = !quote.assignee_id && ["pending", "in_review"].includes(status);

  return (
    <div className="space-y-6">
      {/* Claim Banner */}
      {needsClaim && (
        <div className="rounded-xl border bg-warning/10 border-warning/20 p-4">
          <p className="text-sm text-warning mb-3">This quote is unassigned</p>
          <button
            onClick={claimQuote}
            disabled={claiming}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-warning text-warning-foreground hover:bg-warning/90 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {claiming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Claim Quote
              </>
            )}
          </button>
        </div>
      )}

      {/* Assignment Info */}
      {quote.assignee && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
          <p className="font-medium">
            {quote.assignee.full_name || quote.assignee.email}
            {isAssignedToMe && <span className="text-primary ml-2">(You)</span>}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Accept URL Display */}
      {acceptUrl && (
        <div className="rounded-xl border bg-success/10 border-success/20 p-4 space-y-2">
          <p className="text-sm font-medium text-success">Quote sent successfully!</p>
          <p className="text-xs text-muted-foreground">Customer accept link:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={acceptUrl}
              readOnly
              className="flex-1 px-3 py-2 text-xs rounded-lg border bg-background truncate"
            />
            <button
              onClick={copyAcceptUrl}
              className="p-2 rounded-lg border hover:bg-muted transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <a
              href={acceptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg border hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* Pricing Editor */}
      {canEdit && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Pricing</h2>

          <PricingEditor
            initialBreakdown={quote.pricing_breakdown}
            onChange={handlePricingChange}
          />

          {/* Quote Validity */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quote Valid For</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={validityDays}
                onChange={(e) => setValidityDays(parseInt(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={3}>3 days</option>
                <option value={5}>5 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-2 block">Notes to Customer (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={sendQuote}
            disabled={loading || (!pricing || pricing.total <= 0)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                {status === "quoted" ? "Update & Resend Quote" : "Send Quote"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Actions */}
      {status === "quoted" && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="font-semibold">Manual Status Update</h2>
          <p className="text-xs text-muted-foreground">
            Use these if customer responds via phone/email
          </p>
          <button
            onClick={() => updateStatus("accepted")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-success bg-success/10 text-success hover:bg-success/20 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <CheckCircle className="h-4 w-4" />
            Mark as Accepted
          </button>
          <button
            onClick={() => updateStatus("rejected")}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <XCircle className="h-4 w-4" />
            Mark as Rejected
          </button>
        </div>
      )}

      {/* Create Load */}
      {status === "accepted" && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <a
            href={`/admin/loads/new?quote_id=${quote.id}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Truck className="h-4 w-4" />
            Create Load
          </a>
        </div>
      )}

      {/* Current Pricing Display (for quoted/accepted) */}
      {quote.pricing_breakdown && ["quoted", "accepted", "rejected"].includes(status) && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Quote Details</h2>
          <div className="space-y-2 text-sm">
            {quote.pricing_breakdown.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">{item.description}</span>
                <span>${item.amount.toFixed(2)}</span>
              </div>
            ))}
            {quote.pricing_breakdown.fees?.map((fee, i) => (
              <div key={`fee-${i}`} className="flex justify-between">
                <span className="text-muted-foreground">{fee.description}</span>
                <span>${fee.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t font-semibold">
              <span>Total</span>
              <span className="text-primary">
                ${quote.pricing_breakdown.total.toFixed(2)}
              </span>
            </div>
          </div>
          {quote.expires_at && (
            <p className="text-xs text-muted-foreground mt-3">
              Valid until: {new Date(quote.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
