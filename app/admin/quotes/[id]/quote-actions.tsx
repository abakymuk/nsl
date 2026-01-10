"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Send, CheckCircle, XCircle, Truck, Loader2 } from "lucide-react";

interface QuoteActionsProps {
  quote: {
    id: string;
    status: string;
    quoted_price?: number;
    email: string;
    company_name: string;
  };
}

export function QuoteActions({ quote }: QuoteActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState(quote.quoted_price?.toString() || "");
  const [error, setError] = useState("");

  async function updateQuoteStatus(status: string, quotedPrice?: number) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, quoted_price: quotedPrice }),
      });

      if (!response.ok) {
        throw new Error("Failed to update quote");
      }

      router.refresh();
    } catch (err) {
      setError("Failed to update quote. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendQuote() {
    if (!price || parseFloat(price) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    await updateQuoteStatus("quoted", parseFloat(price));
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
      <h2 className="font-semibold">Actions</h2>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Quote Price Input */}
      {(quote.status === "pending" || quote.status === "quoted") && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Quote Price</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            onClick={sendQuote}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                {quote.status === "quoted" ? "Update Quote" : "Send Quote"}
              </>
            )}
          </button>
        </div>
      )}

      {/* Status Actions */}
      <div className="space-y-2">
        {quote.status === "quoted" && (
          <>
            <button
              onClick={() => updateQuoteStatus("accepted")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <CheckCircle className="h-4 w-4" />
              Mark as Accepted
            </button>
            <button
              onClick={() => updateQuoteStatus("rejected")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              <XCircle className="h-4 w-4" />
              Mark as Rejected
            </button>
          </>
        )}

        {quote.status === "accepted" && (
          <a
            href={`/admin/shipments/new?quote_id=${quote.id}`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Truck className="h-4 w-4" />
            Create Shipment
          </a>
        )}
      </div>

      {/* Quote Info */}
      {quote.quoted_price && (
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">Quoted Price</p>
          <p className="text-2xl font-bold text-primary">
            ${quote.quoted_price.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
