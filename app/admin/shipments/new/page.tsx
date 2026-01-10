"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewShipmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quote_id");

  const [loading, setLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(!!quoteId);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    container_number: "",
    origin: "",
    destination: "",
    eta: "",
    customer_email: "",
    customer_name: "",
    notes: "",
  });

  useEffect(() => {
    if (quoteId) {
      fetchQuote(quoteId);
    }
  }, [quoteId]);

  async function fetchQuote(id: string) {
    try {
      const response = await fetch(`/api/admin/quotes/${id}`);
      if (response.ok) {
        const { quote } = await response.json();
        setFormData((prev) => ({
          ...prev,
          container_number: quote.container_number || "",
          origin: quote.pickup_location || "",
          destination: quote.delivery_location || "",
          customer_email: quote.email || "",
          customer_name: quote.company_name || "",
        }));
      }
    } catch (err) {
      console.error("Error fetching quote:", err);
    } finally {
      setLoadingQuote(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quote_id: quoteId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create shipment");
      }

      const { shipment } = await response.json();
      router.push(`/admin/shipments/${shipment.id}`);
    } catch (err) {
      setError("Failed to create shipment. Please try again.");
      setLoading(false);
    }
  }

  if (loadingQuote) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/shipments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shipments
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Create New Shipment</h1>
        <p className="text-muted-foreground mt-1">
          Enter the shipment details below
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Shipment Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Container Number *
              </label>
              <input
                type="text"
                required
                value={formData.container_number}
                onChange={(e) =>
                  setFormData({ ...formData, container_number: e.target.value })
                }
                placeholder="ABCD1234567"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                ETA
              </label>
              <input
                type="datetime-local"
                value={formData.eta}
                onChange={(e) =>
                  setFormData({ ...formData, eta: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Origin *
              </label>
              <input
                type="text"
                required
                value={formData.origin}
                onChange={(e) =>
                  setFormData({ ...formData, origin: e.target.value })
                }
                placeholder="Port of Long Beach"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Destination *
              </label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) =>
                  setFormData({ ...formData, destination: e.target.value })
                }
                placeholder="123 Warehouse Dr, Los Angeles"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Customer Information</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                placeholder="Company Name"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Customer Email *
              </label>
              <input
                type="email"
                required
                value={formData.customer_email}
                onChange={(e) =>
                  setFormData({ ...formData, customer_email: e.target.value })
                }
                placeholder="customer@example.com"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              placeholder="Additional notes..."
              className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Shipment"
            )}
          </button>
          <Link
            href="/admin/shipments"
            className="px-6 py-3 rounded-lg border hover:bg-muted transition-colors font-medium"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
