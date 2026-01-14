"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MapPin,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  Anchor,
  ArrowRight,
  Box,
  Scale,
  Hash,
  FileText,
  RefreshCw,
  Copy,
  Check,
  Ship,
  Building2,
  Navigation,
} from "lucide-react";

// Types
interface TrackingEvent {
  status: string;
  location: string | null;
  notes: string | null;
  timestamp: string;
}

interface LoadData {
  trackingNumber: string;
  containerNumber: string;
  containerSize: string | null;
  status: string;
  currentLocation: string | null;
  origin: string | null;
  destination: string | null;
  pickupTime: string | null;
  deliveryTime: string | null;
  eta: string | null;
  driverName: string | null;
  weight: number | null;
  sealNumber: string | null;
  chassisNumber: string | null;
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
  type?: "load" | "quote";
  data?: LoadData | QuoteData;
  message?: string;
  error?: string;
}

// Status configuration
const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  step: number;
}> = {
  booked: {
    label: "Booked",
    color: "text-warning",
    bgColor: "bg-warning/15",
    icon: <FileText className="h-4 w-4" />,
    step: 1,
  },
  at_port: {
    label: "At Port",
    color: "text-chart-4",
    bgColor: "bg-chart-4/15",
    icon: <Anchor className="h-4 w-4" />,
    step: 2,
  },
  picked_up: {
    label: "Picked Up",
    color: "text-primary",
    bgColor: "bg-primary/15",
    icon: <Package className="h-4 w-4" />,
    step: 2,
  },
  in_transit: {
    label: "In Transit",
    color: "text-primary",
    bgColor: "bg-primary/15",
    icon: <Truck className="h-4 w-4" />,
    step: 3,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-accent",
    bgColor: "bg-accent/15",
    icon: <Navigation className="h-4 w-4" />,
    step: 4,
  },
  delivered: {
    label: "Delivered",
    color: "text-success",
    bgColor: "bg-success/15",
    icon: <CheckCircle2 className="h-4 w-4" />,
    step: 5,
  },
  exception: {
    label: "Exception",
    color: "text-destructive",
    bgColor: "bg-destructive/15",
    icon: <AlertCircle className="h-4 w-4" />,
    step: 0,
  },
};

const journeySteps = [
  { key: "booked", label: "Booked", icon: FileText },
  { key: "at_port", label: "At Port", icon: Anchor },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Navigation },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

// Helper to check shipment type
const isLoad = (data: LoadData | QuoteData): data is LoadData => {
  return "events" in data;
};

// Format relative time
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Format ETA
function formatETA(dateString: string): { date: string; time: string; relative: string } {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / 86400000);

  let relative = "";
  if (diffDays < 0) relative = "Overdue";
  else if (diffDays === 0) relative = "Today";
  else if (diffDays === 1) relative = "Tomorrow";
  else if (diffDays <= 7) relative = `In ${diffDays} days`;
  else relative = `In ${Math.ceil(diffDays / 7)} weeks`;

  return {
    date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    relative,
  };
}

// Progress bar component
function JourneyProgress({ currentStatus }: { currentStatus: string }) {
  const currentStep = statusConfig[currentStatus]?.step || 1;
  const isException = currentStatus === "exception";

  return (
    <div className="w-full py-6">
      <div className="relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-muted rounded-full" />

        {/* Active progress line */}
        <motion.div
          className={`absolute top-5 left-0 h-1 rounded-full ${
            isException ? "bg-red-500" : "bg-primary"
          }`}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.min((currentStep - 1) / (journeySteps.length - 1) * 100, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {journeySteps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;
            const StepIcon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center">
                <motion.div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    isException && isCurrent
                      ? "border-red-500 bg-red-500 text-white"
                      : isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-background text-primary"
                      : "border-muted bg-background text-muted-foreground"
                  }`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </motion.div>
                <span
                  className={`mt-2 text-xs font-medium text-center ${
                    isCurrent
                      ? "text-foreground"
                      : isCompleted
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Info card component
function InfoCard({
  icon,
  label,
  value,
  subValue,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-primary/30 bg-primary/5 dark:bg-primary/10"
          : "bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-lg p-2 ${
            highlight
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-1 font-semibold text-foreground truncate">{value}</p>
          {subValue && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Timeline event component
function TimelineEvent({
  event,
  isFirst,
  isLast,
}: {
  event: TrackingEvent;
  isFirst: boolean;
  isLast: boolean;
}) {
  const config = statusConfig[event.status] || {
    label: event.status,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: <Clock className="h-4 w-4" />,
  };

  return (
    <div className="flex gap-4">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isFirst ? "bg-primary text-primary-foreground" : config.bgColor
          }`}
        >
          <span className={isFirst ? "" : config.color}>{config.icon}</span>
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-border my-2" />}
      </div>

      {/* Event content */}
      <div className={`flex-1 ${isLast ? "" : "pb-6"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`font-semibold ${isFirst ? "text-foreground" : "text-muted-foreground"}`}>
              {config.label}
            </p>
            {event.location && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </p>
            )}
            {event.notes && (
              <p className="mt-1 text-sm text-muted-foreground italic">
                {event.notes}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-medium text-muted-foreground">
              {getRelativeTime(event.timestamp)}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {new Date(event.timestamp).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Copy button component
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-muted transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

// Shipment result component
function LoadResult({ data, onTrackAnother }: { data: LoadData; onTrackAnother: () => void }) {
  const config = statusConfig[data.status] || statusConfig.booked;
  const eta = data.eta ? formatETA(data.eta) : null;
  const isDelivered = data.status === "delivered";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header Card */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* Status Banner */}
        <div className={`px-6 py-4 ${config.bgColor}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-background/80 ${config.color}`}>
                {config.icon}
              </div>
              <div>
                <p className={`font-bold text-lg ${config.color}`}>{config.label}</p>
                <p className="text-sm text-muted-foreground">
                  Updated {getRelativeTime(data.lastUpdate)}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-sm">
              {data.containerNumber}
            </Badge>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 border-b">
          <JourneyProgress currentStatus={data.status} />
        </div>

        {/* Route Summary */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Origin
              </p>
              <p className="font-semibold text-foreground">
                {data.origin || "—"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-px w-8 bg-border" />
              <Ship className="h-5 w-5" />
              <ArrowRight className="h-4 w-4" />
              <div className="h-px w-8 bg-border" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Destination
              </p>
              <p className="font-semibold text-foreground">
                {data.destination || "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ETA or Delivery Date - only show ETA for non-delivered shipments */}
        {isDelivered ? (
          data.deliveryTime ? (
            <InfoCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Delivered"
              value={new Date(data.deliveryTime).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              subValue={new Date(data.deliveryTime).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
              highlight
            />
          ) : (
            <InfoCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Status"
              value="Delivered"
              subValue={`Updated ${getRelativeTime(data.lastUpdate)}`}
              highlight
            />
          )
        ) : eta && !isDelivered ? (
          <InfoCard
            icon={<Calendar className="h-5 w-5" />}
            label="ETA"
            value={eta.date}
            subValue={eta.relative}
            highlight
          />
        ) : null}

        {/* Current Location - show as "Delivered To" for delivered shipments */}
        {data.currentLocation && (
          <InfoCard
            icon={<MapPin className="h-5 w-5" />}
            label={isDelivered ? "Delivered To" : "Current Location"}
            value={data.currentLocation}
          />
        )}

        {/* Tracking Number */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg p-2 bg-muted text-muted-foreground shrink-0">
              <Hash className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tracking #
              </p>
              <div className="mt-1 flex items-center gap-1">
                <p className="font-mono text-sm font-semibold text-foreground truncate" title={data.trackingNumber}>
                  {data.trackingNumber}
                </p>
                <CopyButton text={data.trackingNumber} />
              </div>
            </div>
          </div>
        </div>

        {/* Container Size */}
        {data.containerSize && (
          <InfoCard
            icon={<Box className="h-5 w-5" />}
            label="Container"
            value={`${data.containerSize}'`}
            subValue="Standard"
          />
        )}

        {/* Weight */}
        {data.weight && (
          <InfoCard
            icon={<Scale className="h-5 w-5" />}
            label="Weight"
            value={`${data.weight.toLocaleString()} lbs`}
          />
        )}

        {/* Driver */}
        {data.driverName && (
          <InfoCard
            icon={<Truck className="h-5 w-5" />}
            label="Driver"
            value={data.driverName}
          />
        )}
      </div>

      {/* Additional Details */}
      {(data.sealNumber || data.chassisNumber || data.publicNotes) && (
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Additional Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {data.sealNumber && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Seal #:</span>{" "}
                  <span className="font-mono">{data.sealNumber}</span>
                </span>
              </div>
            )}
            {data.chassisNumber && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Chassis #:</span>{" "}
                  <span className="font-mono">{data.chassisNumber}</span>
                </span>
              </div>
            )}
          </div>
          {data.publicNotes && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">{data.publicNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {data.events.length > 0 && (
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Load History</h3>
            <span className="text-xs text-muted-foreground">
              {data.events.length} event{data.events.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-0">
            {data.events.map((event, index) => (
              <TimelineEvent
                key={index}
                event={event}
                isFirst={index === 0}
                isLast={index === data.events.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onTrackAnother}
        >
          <Search className="h-4 w-4 mr-2" />
          Track Another Container
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <a href="tel:+19293940049">
            <Phone className="h-4 w-4 mr-2" />
            Call Support
          </a>
        </Button>
      </div>
    </motion.div>
  );
}

// Quote result component
function QuoteResult({ data, onTrackAnother }: { data: QuoteData; onTrackAnother: () => void }) {
  const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
    quote_pending: {
      label: "Quote Pending",
      color: "text-warning",
      bgColor: "bg-warning/15",
    },
    quote_quoted: {
      label: "Quote Sent",
      color: "text-primary",
      bgColor: "bg-primary/15",
    },
    quote_accepted: {
      label: "Quote Accepted",
      color: "text-success",
      bgColor: "bg-success/15",
    },
    quote_completed: {
      label: "Completed",
      color: "text-success",
      bgColor: "bg-success/15",
    },
    quote_cancelled: {
      label: "Cancelled",
      color: "text-destructive",
      bgColor: "bg-destructive/15",
    },
  };

  const status = statusMap[data.status] || statusMap.quote_pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className={`px-6 py-4 ${status.bgColor}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-background/80 ${status.color}`}>
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className={`font-bold text-lg ${status.color}`}>{status.label}</p>
              <p className="text-sm text-muted-foreground">Quote Request</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Container
              </p>
              <p className="mt-1 font-mono font-semibold">{data.containerNumber}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Reference
              </p>
              <p className="mt-1 font-mono font-semibold">{data.referenceNumber}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">{data.message}</p>
          </div>

          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(data.lastUpdate).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
      </div>

      {/* Contact Card */}
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="font-semibold text-foreground mb-4">Need Assistance?</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="tel:+19293940049"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Phone className="h-4 w-4" />
            (929) 394-0049
          </a>
          <a
            href="mailto:info@newstreamlogistics.com"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-medium hover:bg-muted transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email Us
          </a>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={onTrackAnother}>
        <Search className="h-4 w-4 mr-2" />
        Track Another Container
      </Button>
    </motion.div>
  );
}

// Not found component
function NotFound({ containerNumber, onTrackAnother }: { containerNumber: string; onTrackAnother: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="rounded-2xl border bg-card p-8 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          Container Not Found
        </h2>
        <p className="text-muted-foreground mb-2">
          We couldn&apos;t find a load for{" "}
          <span className="font-mono font-semibold">{containerNumber}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          If you recently submitted a quote, please allow 1-2 hours for processing.
        </p>
      </div>

      {/* Suggestions */}
      <div className="rounded-2xl border bg-card p-6">
        <h3 className="font-semibold text-foreground mb-4">What you can do:</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              1
            </div>
            <p className="text-sm text-muted-foreground">
              Double-check the container number format (e.g., ABCU1234567)
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              2
            </div>
            <p className="text-sm text-muted-foreground">
              Try using your tracking number (NSL...) instead
            </p>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
              3
            </div>
            <p className="text-sm text-muted-foreground">
              Contact our team for assistance
            </p>
          </li>
        </ul>
      </div>

      {/* Contact */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href="tel:+19293940049"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          <Phone className="h-4 w-4" />
          Call (929) 394-0049
        </a>
        <Button variant="outline" className="flex-1" onClick={onTrackAnother}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </motion.div>
  );
}

// Main component
export default function TrackForm() {
  const [containerNumber, setContainerNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedNumber, setSearchedNumber] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Check URL for pre-filled container
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const number = params.get("number") || params.get("container");
    if (number) {
      setContainerNumber(number.toUpperCase());
      // Auto-search
      handleSearchWithNumber(number);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchWithNumber = async (searchNumber: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSearchedNumber(searchNumber.toUpperCase());

    if (!searchNumber || searchNumber.length < 4) {
      setError("Please enter a valid container or tracking number");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/track?container=${encodeURIComponent(searchNumber)}`
      );
      const data: TrackingResult = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to track container");
        setLoading(false);
        return;
      }

      setResult(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearchWithNumber(containerNumber);
  };

  const handleTrackAnother = () => {
    setResult(null);
    setError(null);
    setContainerNumber("");
    setSearchedNumber("");
    // Update URL
    window.history.pushState({}, "", "/track");
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Search Section */}
      <div className={`${result ? "py-8" : "py-16 lg:py-24"} transition-all duration-300`}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {!result && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                  Track Your Load
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                  Enter your container or tracking number to get real-time status updates and delivery information.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Form */}
          <div className={`${result ? "max-w-xl mx-auto" : ""}`}>
            <form onSubmit={handleSearch} className="relative">
              <div className="relative flex items-center">
                <div className="absolute left-4 text-muted-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <Input
                  ref={inputRef}
                  id="containerNumber"
                  name="containerNumber"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                  required
                  placeholder="Enter container or tracking number"
                  disabled={loading}
                  className="h-14 pl-12 pr-32 text-lg rounded-2xl border-2 focus:border-primary"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 h-10 px-6 rounded-xl"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Tracking...
                    </>
                  ) : (
                    "Track"
                  )}
                </Button>
              </div>
            </form>

            {/* Example format hint */}
            {!result && !error && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Example: <span className="font-mono">ABCU1234567</span> or{" "}
                <span className="font-mono">NSL12345678</span>
              </p>
            )}
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results Section */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-16">
        <AnimatePresence mode="wait">
          {result && (
            <>
              {result.found && result.type === "load" && result.data && isLoad(result.data) && (
                <LoadResult data={result.data} onTrackAnother={handleTrackAnother} />
              )}

              {result.found && result.type === "quote" && result.data && !isLoad(result.data) && (
                <QuoteResult data={result.data as QuoteData} onTrackAnother={handleTrackAnother} />
              )}

              {!result.found && (
                <NotFound containerNumber={searchedNumber} onTrackAnother={handleTrackAnother} />
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Trust Section - Only show when no result */}
      {!result && (
        <div className="border-t bg-muted/30">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Real-Time Updates</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Track your load status as it moves through the supply chain
                </p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Location Tracking</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Know exactly where your container is at any moment
                </p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">24/7 Support</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Our team is here to help with any questions
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
