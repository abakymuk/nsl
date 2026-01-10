"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ship,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
} from "lucide-react";

interface ShipmentActionsProps {
  shipment: {
    id: string;
    status: string;
    tracking_number: string;
  };
}

const statusOptions = [
  { value: "booked", label: "Booked", icon: Package },
  { value: "at_port", label: "At Port", icon: Ship },
  { value: "in_transit", label: "In Transit", icon: Truck },
  { value: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { value: "delivered", label: "Delivered", icon: CheckCircle },
  { value: "cancelled", label: "Cancelled", icon: XCircle },
];

export function ShipmentActions({ shipment }: ShipmentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventData, setEventData] = useState({
    description: "",
    location: "",
  });

  async function updateStatus(newStatus: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      router.refresh();
    } catch (err) {
      setError("Failed to update status. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/shipments/${shipment.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: eventData.description,
          location: eventData.location,
          status: shipment.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add event");
      }

      setEventData({ description: "", location: "" });
      setShowEventForm(false);
      router.refresh();
    } catch (err) {
      setError("Failed to add event. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Update Status */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h2 className="font-semibold">Update Status</h2>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="grid gap-2">
          {statusOptions.map((option) => {
            const Icon = option.icon;
            const isActive = shipment.status === option.value;

            return (
              <button
                key={option.value}
                onClick={() => updateStatus(option.value)}
                disabled={loading || isActive}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 disabled:opacity-50"
                }`}
              >
                {loading && shipment.status !== option.value ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                {option.label}
                {isActive && <span className="ml-auto text-xs">Current</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Event */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Add Event</h2>
          <button
            onClick={() => setShowEventForm(!showEventForm)}
            className="text-sm text-primary hover:underline"
          >
            {showEventForm ? "Cancel" : "Add"}
          </button>
        </div>

        {showEventForm && (
          <form onSubmit={addEvent} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Description *
              </label>
              <input
                type="text"
                required
                value={eventData.description}
                onChange={(e) =>
                  setEventData({ ...eventData, description: e.target.value })
                }
                placeholder="Container loaded onto truck"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Location
              </label>
              <input
                type="text"
                value={eventData.location}
                onChange={(e) =>
                  setEventData({ ...eventData, location: e.target.value })
                }
                placeholder="Port of Long Beach"
                className="w-full px-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Event
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Tracking Link */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="font-semibold mb-2">Customer Tracking</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Share this link with the customer
        </p>
        <code className="block p-3 rounded-lg bg-muted text-xs break-all">
          {typeof window !== "undefined"
            ? `${window.location.origin}/track?number=${shipment.tracking_number}`
            : `/track?number=${shipment.tracking_number}`}
        </code>
      </div>
    </div>
  );
}
