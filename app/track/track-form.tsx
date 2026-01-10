"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Mail, MapPin, Truck, Package, CheckCircle2, Clock, FileText } from "lucide-react";

interface TrackingEvent {
  status: string;
  location: string | null;
  notes: string | null;
  timestamp: string;
}

interface ShipmentData {
  containerNumber: string;
  status: string;
  currentLocation: string | null;
  pickupTime: string | null;
  deliveryTime: string | null;
  driverName: string | null;
  publicNotes: string | null;
  lastUpdate: string;
  events: TrackingEvent[];
}

interface QuoteData {
  containerNumber: string;
  status: string;
  referenceNumber: string;
  message: string;
  lastUpdate: string;
}

interface TrackingResult {
  success: boolean;
  found: boolean;
  type?: "shipment" | "quote";
  data?: ShipmentData | QuoteData;
  message?: string;
  error?: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  exception: "Exception",
  quote_pending: "Quote Pending",
  quote_quoted: "Quote Sent",
  quote_accepted: "Quote Accepted",
  quote_completed: "Completed",
  quote_cancelled: "Cancelled",
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  picked_up: "default",
  in_transit: "default",
  out_for_delivery: "default",
  delivered: "secondary",
  exception: "destructive",
  quote_pending: "outline",
  quote_quoted: "secondary",
  quote_accepted: "default",
  quote_completed: "secondary",
  quote_cancelled: "destructive",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  picked_up: <Package className="h-4 w-4" />,
  in_transit: <Truck className="h-4 w-4" />,
  out_for_delivery: <Truck className="h-4 w-4" />,
  delivered: <CheckCircle2 className="h-4 w-4" />,
  exception: <AlertCircle className="h-4 w-4" />,
};

export default function TrackForm() {
  const [containerNumber, setContainerNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (!containerNumber || containerNumber.length < 4) {
      setError("Please enter a valid container number");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/track?container=${encodeURIComponent(containerNumber)}`);
      const data: TrackingResult = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to track container");
        setLoading(false);
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isShipment = (data: ShipmentData | QuoteData): data is ShipmentData => {
    return "events" in data;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Track a Container
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Enter your container number to check its current status and location.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Container Tracking</CardTitle>
            <CardDescription>
              Enter the container number to view real-time tracking information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="containerNumber">
                  Container Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="containerNumber"
                  name="containerNumber"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                  required
                  placeholder="ABCU1234567"
                  disabled={loading}
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Tracking..." : "Track Container"}
              </Button>
            </form>

            {error && (
              <div className="mt-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {result && !result.found && (
              <div className="mt-8 space-y-4 rounded-lg border bg-muted/30 p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium">No shipment found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result.message}
                    </p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">Need help?</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a
                      href="mailto:info@newstreamlogistics.com"
                      className="text-primary hover:underline"
                    >
                      info@newstreamlogistics.com
                    </a>
                  </div>
                </div>
              </div>
            )}

            {result?.found && result.type === "quote" && result.data && !isShipment(result.data) && (
              <div className="mt-8 space-y-6 rounded-lg border bg-muted/30 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Container: {result.data.containerNumber}</h2>
                  <Badge variant={statusColors[result.data.status] || "outline"}>
                    <FileText className="mr-1 h-3 w-3" />
                    {statusLabels[result.data.status] || result.data.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Reference Number:</span>
                    <p className="mt-1 font-mono text-sm">{(result.data as QuoteData).referenceNumber}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Status:</span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {(result.data as QuoteData).message}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Last Update:</span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(result.data.lastUpdate).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">Need immediate assistance?</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a
                      href="mailto:info@newstreamlogistics.com"
                      className="text-primary hover:underline"
                    >
                      info@newstreamlogistics.com
                    </a>
                  </div>
                </div>
              </div>
            )}

            {result?.found && result.type === "shipment" && result.data && isShipment(result.data) && (
              <div className="mt-8 space-y-6 rounded-lg border bg-muted/30 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Container: {result.data.containerNumber}</h2>
                  <Badge variant={statusColors[result.data.status] || "default"} className="flex items-center gap-1">
                    {statusIcons[result.data.status]}
                    {statusLabels[result.data.status] || result.data.status}
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {result.data.currentLocation && (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                      <div>
                        <span className="text-sm font-medium">Current Location</span>
                        <p className="text-sm text-muted-foreground">{result.data.currentLocation}</p>
                      </div>
                    </div>
                  )}
                  {result.data.driverName && (
                    <div className="flex items-start gap-2">
                      <Truck className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                      <div>
                        <span className="text-sm font-medium">Driver</span>
                        <p className="text-sm text-muted-foreground">{result.data.driverName}</p>
                      </div>
                    </div>
                  )}
                  {result.data.pickupTime && (
                    <div>
                      <span className="text-sm font-medium">Pickup Time</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(result.data.pickupTime).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  )}
                  {result.data.deliveryTime && (
                    <div>
                      <span className="text-sm font-medium">Delivery Time</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(result.data.deliveryTime).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {result.data.publicNotes && (
                  <div className="rounded-md bg-muted p-3">
                    <span className="text-sm font-medium">Notes:</span>
                    <p className="mt-1 text-sm text-muted-foreground">{result.data.publicNotes}</p>
                  </div>
                )}

                {result.data.events.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-medium">Shipment Timeline</h3>
                    <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-border">
                      {result.data.events.map((event, index) => (
                        <div key={index} className="relative">
                          <div className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {statusLabels[event.status] || event.status}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleString("en-US", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </span>
                            </div>
                            {event.location && (
                              <p className="text-sm text-muted-foreground">{event.location}</p>
                            )}
                            {event.notes && (
                              <p className="text-sm text-muted-foreground italic">{event.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(result.data.lastUpdate).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 rounded-lg bg-muted/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Track your shipment in real-time. Contact us if you need any assistance with your delivery.
          </p>
        </div>
      </div>
    </div>
  );
}
