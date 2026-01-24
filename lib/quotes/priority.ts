/**
 * Quote Priority Scoring and SLA Status
 *
 * Calculates priority scores for quote queue ordering and
 * determines SLA compliance status based on response times.
 */

import { Quote, QuoteStatus } from "@/types/database";

// SLA thresholds in hours
export const SLA_THRESHOLDS = {
  URGENT: 2, // Urgent quotes should be responded to within 2 hours
  STANDARD: 4, // Standard quotes within 4 hours
  LOW: 8, // Low priority within 8 hours
} as const;

export type SLAStatus = "overdue" | "warning" | "ok";

export interface QuotePriority {
  score: number; // 0-100, higher = more urgent
  slaStatus: SLAStatus;
  hoursPending: number;
  factors: {
    leadScore: number; // 0-30 points
    urgency: number; // 0-30 points (based on time pending)
    customerValue: number; // 0-20 points (placeholder for tier)
    timeSensitive: number; // 0-20 points
  };
}

/**
 * Calculate hours since quote was created
 */
export function getHoursPending(quote: Quote): number {
  const created = new Date(quote.created_at);
  const now = new Date();
  return (now.getTime() - created.getTime()) / (1000 * 60 * 60);
}

/**
 * Determine SLA status based on quote urgency and time pending
 */
export function getSLAStatus(quote: Quote): SLAStatus {
  const hoursPending = getHoursPending(quote);

  // Only pending and in_review quotes have SLA
  const activeStatuses: QuoteStatus[] = ["pending", "in_review"];
  if (!activeStatuses.includes(quote.lifecycle_status)) {
    return "ok";
  }

  // Urgent quotes have tighter SLA
  const threshold = quote.is_urgent ? SLA_THRESHOLDS.URGENT : SLA_THRESHOLDS.STANDARD;

  if (hoursPending > threshold * 2) {
    return "overdue";
  } else if (hoursPending > threshold) {
    return "warning";
  }

  return "ok";
}

/**
 * Calculate priority score for a quote (0-100)
 * Higher score = higher priority in the queue
 */
export function calculateQuotePriority(quote: Quote): QuotePriority {
  const hoursPending = getHoursPending(quote);
  const slaStatus = getSLAStatus(quote);

  // Factor 1: Lead Score (0-30 points)
  // lead_score is 0-10, scale to 0-30
  const leadScorePoints = Math.min((quote.lead_score || 0) * 3, 30);

  // Factor 2: Time Urgency (0-30 points)
  // More points for quotes pending longer
  let urgencyPoints = 0;
  if (hoursPending >= SLA_THRESHOLDS.LOW) {
    urgencyPoints = 30; // Max urgency
  } else if (hoursPending >= SLA_THRESHOLDS.STANDARD) {
    urgencyPoints = 20;
  } else if (hoursPending >= SLA_THRESHOLDS.URGENT) {
    urgencyPoints = 10;
  } else if (hoursPending >= 1) {
    urgencyPoints = 5;
  }

  // Factor 3: Customer Value (0-20 points)
  // Placeholder - could integrate with customer tier system
  // For now, base on company presence
  const customerValuePoints = quote.company_name ? 10 : 5;

  // Factor 4: Time Sensitive Flag (0-20 points)
  // Quotes marked as time-sensitive get boost
  let timeSensitivePoints = 0;
  if (quote.is_urgent) {
    timeSensitivePoints = 20;
  } else if (quote.time_sensitive) {
    timeSensitivePoints = 15;
  } else if (quote.request_type === "urgent_lfd" || quote.request_type === "rolled") {
    timeSensitivePoints = 15;
  }

  // Calculate total score (0-100)
  const score = Math.min(
    leadScorePoints + urgencyPoints + customerValuePoints + timeSensitivePoints,
    100
  );

  return {
    score,
    slaStatus,
    hoursPending,
    factors: {
      leadScore: leadScorePoints,
      urgency: urgencyPoints,
      customerValue: customerValuePoints,
      timeSensitive: timeSensitivePoints,
    },
  };
}

/**
 * Get SLA deadline for a quote
 */
export function getSLADeadline(quote: Quote): Date {
  const created = new Date(quote.created_at);
  const threshold = quote.is_urgent ? SLA_THRESHOLDS.URGENT : SLA_THRESHOLDS.STANDARD;
  return new Date(created.getTime() + threshold * 60 * 60 * 1000);
}

/**
 * Get time remaining until SLA breach (in hours, negative if overdue)
 */
export function getTimeToSLA(quote: Quote): number {
  const deadline = getSLADeadline(quote);
  const now = new Date();
  return (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Format SLA status for display
 */
export function formatSLAStatus(status: SLAStatus): {
  label: string;
  color: "red" | "yellow" | "green";
  description: string;
} {
  switch (status) {
    case "overdue":
      return {
        label: "Overdue",
        color: "red",
        description: "Response time exceeded SLA threshold",
      };
    case "warning":
      return {
        label: "Due Soon",
        color: "yellow",
        description: "Approaching SLA deadline",
      };
    case "ok":
      return {
        label: "On Track",
        color: "green",
        description: "Within SLA window",
      };
  }
}

/**
 * Sort quotes by priority (highest first)
 */
export function sortByPriority<T extends Quote>(quotes: T[]): T[] {
  return [...quotes].sort((a, b) => {
    const priorityA = calculateQuotePriority(a);
    const priorityB = calculateQuotePriority(b);
    return priorityB.score - priorityA.score;
  });
}

/**
 * Filter quotes by SLA status
 */
export function filterBySLAStatus<T extends Quote>(
  quotes: T[],
  status: SLAStatus | SLAStatus[]
): T[] {
  const statuses = Array.isArray(status) ? status : [status];
  return quotes.filter((quote) => statuses.includes(getSLAStatus(quote)));
}
