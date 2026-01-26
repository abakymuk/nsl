/**
 * Unified Status Configuration
 *
 * Central configuration for all status types (loads, quotes).
 * Provides consistent colors, labels, and styling across the app.
 */

// ============================================================
// LOAD / TRACKING STATUSES
// ============================================================

export type LoadStatus =
  | "booked"
  | "at_port"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception";

export interface LoadStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  step: number;
}

export const LOAD_STATUS_CONFIG: Record<LoadStatus, LoadStatusConfig> = {
  booked: {
    label: "Booked",
    color: "text-warning",
    bgColor: "bg-warning/15",
    step: 1,
  },
  at_port: {
    label: "At Port",
    color: "text-chart-4",
    bgColor: "bg-chart-4/15",
    step: 2,
  },
  picked_up: {
    label: "Picked Up",
    color: "text-primary",
    bgColor: "bg-primary/15",
    step: 2,
  },
  in_transit: {
    label: "In Transit",
    color: "text-primary",
    bgColor: "bg-primary/15",
    step: 3,
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-accent",
    bgColor: "bg-accent/15",
    step: 4,
  },
  delivered: {
    label: "Delivered",
    color: "text-success",
    bgColor: "bg-success/15",
    step: 5,
  },
  exception: {
    label: "Exception",
    color: "text-destructive",
    bgColor: "bg-destructive/15",
    step: 0,
  },
};

export const LOAD_JOURNEY_STEPS = [
  { key: "booked" as const, label: "Booked" },
  { key: "at_port" as const, label: "At Port" },
  { key: "in_transit" as const, label: "In Transit" },
  { key: "out_for_delivery" as const, label: "Out for Delivery" },
  { key: "delivered" as const, label: "Delivered" },
];

export function getLoadStatusConfig(status: string): LoadStatusConfig {
  return (
    LOAD_STATUS_CONFIG[status as LoadStatus] || {
      label: status.replace(/_/g, " "),
      color: "text-muted-foreground",
      bgColor: "bg-muted",
      step: 0,
    }
  );
}

// ============================================================
// QUOTE STATUSES
// ============================================================

export type QuoteLifecycleStatus =
  | "pending"
  | "in_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export interface QuoteStatusConfig {
  label: string;
  badgeClass: string;
  color: "primary" | "success" | "warning" | "destructive" | "muted";
}

export const QUOTE_STATUS_CONFIG: Record<QuoteLifecycleStatus, QuoteStatusConfig> = {
  pending: {
    label: "Pending",
    badgeClass: "bg-warning/15 text-warning",
    color: "warning",
  },
  in_review: {
    label: "In Review",
    badgeClass: "bg-primary/15 text-primary",
    color: "primary",
  },
  quoted: {
    label: "Quoted",
    badgeClass: "bg-blue-500/15 text-blue-600",
    color: "primary",
  },
  accepted: {
    label: "Accepted",
    badgeClass: "bg-success/15 text-success",
    color: "success",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-destructive/15 text-destructive",
    color: "destructive",
  },
  expired: {
    label: "Expired",
    badgeClass: "bg-muted text-muted-foreground",
    color: "muted",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "bg-muted text-muted-foreground",
    color: "muted",
  },
};

export function getQuoteStatusConfig(status: string): QuoteStatusConfig {
  return (
    QUOTE_STATUS_CONFIG[status as QuoteLifecycleStatus] || {
      label: status.replace(/_/g, " "),
      badgeClass: "bg-muted text-muted-foreground",
      color: "muted" as const,
    }
  );
}

export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============================================================
// REJECTION REASONS
// ============================================================

export const QUOTE_REJECTION_REASONS = [
  { value: "price_too_high", label: "Price is too high" },
  { value: "found_alternative", label: "Found alternative carrier" },
  { value: "no_longer_needed", label: "No longer need this service" },
  { value: "timing_issues", label: "Timing doesn't work" },
  { value: "other", label: "Other reason" },
] as const;

export type RejectionReason = (typeof QUOTE_REJECTION_REASONS)[number]["value"];
