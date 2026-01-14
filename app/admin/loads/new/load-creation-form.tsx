"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck, MapPin, User, Package, Calendar, FileText } from "lucide-react";

interface Quote {
  id: string;
  reference_number: string;
  container_number: string;
  container_type: string;
  pickup_terminal: string;
  delivery_zip: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_state?: string;
  contact_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  quoted_price?: number;
  lfd?: string;
  special_instructions?: string;
}

interface LoadCreationFormProps {
  quote: Quote | null;
}

const TERMINALS: Record<string, string> = {
  APM: "APM Terminals",
  Fenix: "Fenix Marine Services",
  TraPac: "TraPac",
  Yusen: "Yusen Terminal",
  LBCT: "Long Beach Container Terminal",
  TTI: "Total Terminals International",
  Everport: "Everport Terminal Services",
  PCT: "Pacific Container Terminal",
  WBCT: "West Basin Container Terminal",
  LACT: "Los Angeles Container Terminal",
};

export function LoadCreationForm({ quote }: LoadCreationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    container_number: quote?.container_number || "",
    container_size: quote?.container_type || "40ft",
    origin: quote?.pickup_terminal ? TERMINALS[quote.pickup_terminal] || quote.pickup_terminal : "",
    destination: quote
      ? [quote.delivery_address, quote.delivery_city, quote.delivery_state, quote.delivery_zip]
          .filter(Boolean)
          .join(", ") || quote.delivery_zip
      : "",
    customer_name: quote?.company_name || quote?.contact_name || "",
    customer_email: quote?.email || "",
    eta: quote?.lfd || "",
    driver_name: "",
    truck_number: "",
    public_notes: quote?.special_instructions || "",
    internal_notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quote_id: quote?.id || null,
          status: "booked",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create load");
      }

      // Redirect to the new load
      router.push(`/admin/loads/${data.load.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create load");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Container Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Package className="h-5 w-5 text-primary" />
            Container Details
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Container Number *</label>
              <input
                type="text"
                name="container_number"
                value={formData.container_number}
                onChange={handleChange}
                required
                placeholder="MSCU1234567"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Container Size</label>
              <select
                name="container_size"
                value={formData.container_size}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="20ft">20ft Standard</option>
                <option value="40ft">40ft Standard</option>
                <option value="40ft HC">40ft High Cube</option>
                <option value="45ft">45ft High Cube</option>
              </select>
            </div>
          </div>
        </div>

        {/* Route Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <MapPin className="h-5 w-5 text-primary" />
            Route Information
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Origin (Pickup Location) *</label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                required
                placeholder="APM Terminals, Los Angeles"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Destination (Delivery Address) *</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                required
                placeholder="1234 Main St, Los Angeles, CA 90001"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <User className="h-5 w-5 text-primary" />
            Customer Information
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Customer / Company Name</label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="Acme Corp"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Customer Email</label>
              <input
                type="email"
                name="customer_email"
                value={formData.customer_email}
                onChange={handleChange}
                placeholder="customer@example.com"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Dispatch Info */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Truck className="h-5 w-5 text-primary" />
            Dispatch Details
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Driver Name</label>
              <input
                type="text"
                name="driver_name"
                value={formData.driver_name}
                onChange={handleChange}
                placeholder="John Smith"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Truck Number</label>
              <input
                type="text"
                name="truck_number"
                value={formData.truck_number}
                onChange={handleChange}
                placeholder="TRK-001"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Estimated Arrival (ETA)</label>
            <input
              type="date"
              name="eta"
              value={formData.eta}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <FileText className="h-5 w-5 text-primary" />
            Notes
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Public Notes (visible to customer)</label>
              <textarea
                name="public_notes"
                value={formData.public_notes}
                onChange={handleChange}
                rows={2}
                placeholder="Notes visible to the customer on tracking page"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Internal Notes (admin only)</label>
              <textarea
                name="internal_notes"
                value={formData.internal_notes}
                onChange={handleChange}
                rows={2}
                placeholder="Internal notes for dispatchers"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Truck className="h-4 w-4" />
              Create Load
            </>
          )}
        </button>
      </div>
    </form>
  );
}
