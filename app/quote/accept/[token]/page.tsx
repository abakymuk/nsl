"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Package,
  MapPin,
  Clock,
  AlertTriangle,
  Loader2,
  Phone,
  ArrowLeft,
} from "lucide-react";
import { Quote, PricingBreakdown } from "@/types/database";

interface AcceptPageProps {
  params: Promise<{ token: string }>;
}

const REJECTION_REASONS = [
  { value: "price_too_high", label: "Price is too high" },
  { value: "found_alternative", label: "Found alternative carrier" },
  { value: "no_longer_needed", label: "No longer need this service" },
  { value: "timing_issues", label: "Timing doesn&apos;t work" },
  { value: "other", label: "Other reason" },
];

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PricingBreakdownDisplay({ breakdown }: { breakdown: PricingBreakdown | null }) {
  if (!breakdown) return null;

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-sm">Price Breakdown</h4>
      <div className="space-y-2">
        {breakdown.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.description}
              {item.quantity && item.quantity > 1 && ` (x${item.quantity})`}
            </span>
            <span>{formatCurrency(item.amount)}</span>
          </div>
        ))}
        {breakdown.fees?.map((fee, idx) => (
          <div key={`fee-${idx}`} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{fee.description}</span>
            <span>{formatCurrency(fee.amount)}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between font-medium">
          <span>Total</span>
          <span>{formatCurrency(breakdown.total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function QuoteAcceptPage({ params }: AcceptPageProps) {
  const [token, setToken] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activityLogged, setActivityLogged] = useState(false);

  // Form state
  const [mode, setMode] = useState<"accept" | "reject" | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signature, setSignature] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");

  // Success state
  const [success, setSuccess] = useState<{
    action: "accepted" | "rejected";
    confirmationNumber?: string;
  } | null>(null);

  // Helper to log activity (non-blocking)
  const logActivity = async (activityType: string, currentToken?: string) => {
    const t = currentToken || token;
    if (!t) return;
    try {
      await fetch("/api/quote/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, activity_type: activityType }),
      });
    } catch {
      // Silently fail - activity logging shouldn't block UX
    }
  };

  useEffect(() => {
    async function loadQuote() {
      const { token: t } = await params;
      setToken(t);

      try {
        const response = await fetch(`/api/quote/validate?token=${t}&type=accept`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Quote not found or link has expired");
          } else {
            setError("Failed to load quote");
          }
          return;
        }

        const data = await response.json();
        setQuote(data.quote);

        // Log page view (only once)
        if (!activityLogged) {
          setActivityLogged(true);
          logActivity("accept_page_viewed", t);
        }
      } catch {
        setError("Failed to load quote");
      } finally {
        setLoading(false);
      }
    }

    loadQuote();
  }, [params, activityLogged]);

  // Log when user starts filling the form (selects accept or reject)
  const handleModeSelect = (selectedMode: "accept" | "reject") => {
    setMode(selectedMode);
    logActivity("acceptance_started");
  };

  const handleSubmit = async () => {
    if (!token || !quote) return;

    if (mode === "accept" && (!acceptTerms || !signature.trim())) {
      return;
    }

    if (mode === "reject" && !rejectionReason) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/quote/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: mode,
          signature: mode === "accept" ? signature.trim() : undefined,
          rejection_reason: mode === "reject" ? rejectionReason : undefined,
          rejection_notes: mode === "reject" ? rejectionNotes : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to process request");
        return;
      }

      setSuccess({
        action: mode === "accept" ? "accepted" : "rejected",
        confirmationNumber: data.confirmationNumber,
      });
    } catch {
      setError("Failed to process request");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error && !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Unable to Load Quote</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link
            href="/quote"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Request New Quote
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="bg-card rounded-2xl shadow-lg border p-8 text-center">
            {success.action === "accepted" ? (
              <>
                <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Quote Accepted!</h1>
                <p className="text-muted-foreground mb-6">
                  Thank you for your business. Our team will begin processing your
                  shipment and will contact you shortly with next steps.
                </p>
                {success.confirmationNumber && (
                  <div className="bg-muted rounded-lg p-4 mb-6">
                    <p className="text-xs text-muted-foreground">Confirmation Number</p>
                    <p className="font-mono text-lg font-medium">
                      {success.confirmationNumber}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-2">Quote Declined</h1>
                <p className="text-muted-foreground mb-6">
                  We&apos;re sorry this quote didn&apos;t work out. Feel free to reach out if
                  you need drayage services in the future.
                </p>
              </>
            )}
            <div className="space-y-3">
              <Link
                href="/"
                className="block w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg font-medium"
              >
                Return to Homepage
              </Link>
              <a
                href="tel:+18885330302"
                className="block w-full py-2 px-4 border rounded-lg text-sm"
              >
                <Phone className="h-4 w-4 inline mr-2" />
                Call Us: (888) 533-0302
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  const totalPrice = quote.total_price || quote.quoted_price;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-2xl font-bold">Review Your Quote</h1>
          <p className="text-muted-foreground">
            Reference: {quote.reference_number}
          </p>
        </div>

        {/* Quote Summary Card */}
        <div className="bg-card rounded-2xl shadow-lg border overflow-hidden mb-6">
          {/* Price Header */}
          <div className="bg-success/10 p-6 text-center border-b">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Quoted Price
            </p>
            <p className="text-4xl font-bold text-success">
              {formatCurrency(totalPrice)}
            </p>
            {quote.expires_at && (
              <p className="text-sm text-muted-foreground mt-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Valid until {formatDate(quote.expires_at)}
              </p>
            )}
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Container</p>
                  <p className="font-mono font-medium">
                    {quote.container_number || "TBD"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Delivery</p>
                  <p className="font-medium">{quote.delivery_zip}</p>
                </div>
              </div>
            </div>

            {quote.pickup_terminal && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Pickup Terminal</p>
                  <p className="font-medium">{quote.pickup_terminal}</p>
                </div>
              </div>
            )}

            {/* Pricing Breakdown */}
            <PricingBreakdownDisplay breakdown={quote.pricing_breakdown} />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Action Selection */}
        {!mode && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleModeSelect("accept")}
              className="flex flex-col items-center gap-2 p-6 bg-success/10 border-2 border-success/30 rounded-xl hover:border-success transition-colors"
            >
              <CheckCircle className="h-8 w-8 text-success" />
              <span className="font-medium">Accept Quote</span>
            </button>
            <button
              onClick={() => handleModeSelect("reject")}
              className="flex flex-col items-center gap-2 p-6 bg-muted border-2 border-transparent rounded-xl hover:border-muted-foreground/30 transition-colors"
            >
              <XCircle className="h-8 w-8 text-muted-foreground" />
              <span className="font-medium">Decline Quote</span>
            </button>
          </div>
        )}

        {/* Accept Form */}
        {mode === "accept" && (
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Accept Quote</h2>
              <button
                onClick={() => setMode(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            {/* Terms Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">
                I accept the quoted price of{" "}
                <strong>{formatCurrency(totalPrice)}</strong> and authorize New
                Stream Logistics to proceed with this shipment. I understand this
                is a binding agreement.
              </span>
            </label>

            {/* Digital Signature */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Digital Signature (Type Your Full Name)
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="John Smith"
                className="w-full px-4 py-3 border rounded-lg bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                By typing your name, you are electronically signing this
                agreement.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!acceptTerms || !signature.trim() || submitting}
              className="w-full py-3 px-6 bg-success text-white rounded-xl font-medium hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Confirm Acceptance
                </>
              )}
            </button>
          </div>
        )}

        {/* Reject Form */}
        {mode === "reject" && (
          <div className="bg-card rounded-xl border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Decline Quote</h2>
              <button
                onClick={() => setMode(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Reason for Declining
              </label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg bg-background"
              >
                <option value="">Select a reason...</option>
                {REJECTION_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Any feedback helps us improve..."
                rows={3}
                className="w-full px-4 py-3 border rounded-lg bg-background resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!rejectionReason || submitting}
              className="w-full py-3 px-6 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  Confirm Decline
                </>
              )}
            </button>
          </div>
        )}

        {/* Contact Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Questions before deciding?
          </p>
          <a
            href="tel:+18885330302"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Phone className="h-4 w-4" />
            (888) 533-0302
          </a>
        </div>
      </div>
    </div>
  );
}
