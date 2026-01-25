/**
 * Notification System Types
 */

// All possible notification events
export type NotificationEvent =
  // Quote Journey Events (customer-facing)
  | "quote_email_opened"
  | "quote_status_viewed"
  | "quote_accept_page_viewed"
  | "quote_acceptance_started"
  | "quote_accepted"
  | "quote_rejected"
  | "quote_expired"
  | "quote_expiring_soon"
  // Quote Admin Events
  | "quote_submitted"
  | "quote_assigned"
  | "quote_sent"
  // Load Events
  | "load_status_changed"
  | "load_delayed"
  | "load_delivered"
  | "load_issue";

// Priority levels
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

// Entity types that notifications can reference
export type NotificationEntityType = "quote" | "load" | "customer";

// Notification channels
export type NotificationChannel = "in_app" | "email" | "slack";

// Base notification data
export interface NotificationData {
  event: NotificationEvent;
  title: string;
  body?: string;
  priority: NotificationPriority;
  entityType: NotificationEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
}

// Database notification record
export interface Notification {
  id: string;
  recipient_id: string;
  event_type: NotificationEvent;
  title: string;
  body: string | null;
  priority: NotificationPriority;
  entity_type: NotificationEntityType | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

// Employee preferences
export interface NotificationPreferences {
  id: string;
  employee_id: string;
  channels: Record<NotificationChannel, boolean>;
  event_settings: Record<NotificationEvent, Partial<Record<NotificationChannel, boolean>>>;
  quiet_hours: {
    enabled: boolean;
    start?: string; // "22:00"
    end?: string; // "08:00"
    timezone?: string;
  };
  email_priority_threshold: NotificationPriority;
  created_at: string;
  updated_at: string;
}

// Quote activity log entry
export type QuoteActivityType =
  | "email_sent"
  | "email_opened"
  | "status_viewed"
  | "accept_page_viewed"
  | "acceptance_started"
  | "accepted"
  | "rejected";

export interface QuoteActivityLog {
  id: string;
  quote_id: string;
  activity_type: QuoteActivityType;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Event configuration for building notifications
export interface EventConfig {
  event: NotificationEvent;
  titleTemplate: string;
  bodyTemplate?: string;
  priority: NotificationPriority;
  entityType: NotificationEntityType;
  // Which permission is required to receive this notification
  permission: string;
  // Slack channel override (optional)
  slackChannel?: string;
}

// Event templates - used to build notification title/body
export const EVENT_CONFIGS: Record<NotificationEvent, Omit<EventConfig, "event">> = {
  // Quote Journey
  quote_email_opened: {
    titleTemplate: "Quote {{reference}} email opened",
    bodyTemplate: "{{contact_name}} opened the quote email",
    priority: "normal",
    entityType: "quote",
    permission: "quotes",
  },
  quote_status_viewed: {
    titleTemplate: "Quote {{reference}} status page viewed",
    bodyTemplate: "Customer is checking quote status",
    priority: "normal",
    entityType: "quote",
    permission: "quotes",
  },
  quote_accept_page_viewed: {
    titleTemplate: "Quote {{reference}} accept page viewed",
    bodyTemplate: "{{contact_name}} is reviewing the quote to accept/decline",
    priority: "high",
    entityType: "quote",
    permission: "quotes",
  },
  quote_acceptance_started: {
    titleTemplate: "Quote {{reference}} acceptance in progress",
    bodyTemplate: "{{contact_name}} started filling the acceptance form",
    priority: "high",
    entityType: "quote",
    permission: "quotes",
  },
  quote_accepted: {
    titleTemplate: "Quote {{reference}} ACCEPTED",
    bodyTemplate: "{{contact_name}} accepted the quote for {{amount}}",
    priority: "urgent",
    entityType: "quote",
    permission: "quotes",
    slackChannel: "quotes-accepted",
  },
  quote_rejected: {
    titleTemplate: "Quote {{reference}} declined",
    bodyTemplate: "{{contact_name}} declined: {{reason}}",
    priority: "high",
    entityType: "quote",
    permission: "quotes",
  },
  quote_expired: {
    titleTemplate: "Quote {{reference}} expired",
    bodyTemplate: "Quote expired without customer action",
    priority: "normal",
    entityType: "quote",
    permission: "quotes",
  },
  quote_expiring_soon: {
    titleTemplate: "Quote {{reference}} expires in 24h",
    bodyTemplate: "Customer hasn't responded. Consider following up.",
    priority: "high",
    entityType: "quote",
    permission: "quotes",
  },
  // Quote Admin
  quote_submitted: {
    titleTemplate: "New quote request",
    bodyTemplate: "{{contact_name}} requested a quote for {{container}} to {{delivery_zip}}",
    priority: "high",
    entityType: "quote",
    permission: "quotes",
    slackChannel: "new-quotes",
  },
  quote_assigned: {
    titleTemplate: "Quote {{reference}} assigned to you",
    bodyTemplate: "You've been assigned to handle this quote",
    priority: "normal",
    entityType: "quote",
    permission: "quotes",
  },
  quote_sent: {
    titleTemplate: "Quote {{reference}} sent",
    bodyTemplate: "Quote for {{amount}} sent to {{contact_name}}",
    priority: "normal",
    entityType: "quote",
    permission: "quotes",
  },
  // Load Events
  load_status_changed: {
    titleTemplate: "Load {{reference}} status: {{status}}",
    bodyTemplate: "Container {{container}} moved to {{status}}",
    priority: "normal",
    entityType: "load",
    permission: "loads",
  },
  load_delayed: {
    titleTemplate: "Load {{reference}} DELAYED",
    bodyTemplate: "Delivery date pushed from {{old_date}} to {{new_date}}",
    priority: "high",
    entityType: "load",
    permission: "loads",
    slackChannel: "load-alerts",
  },
  load_delivered: {
    titleTemplate: "Load {{reference}} delivered",
    bodyTemplate: "Container {{container}} delivered successfully",
    priority: "normal",
    entityType: "load",
    permission: "loads",
  },
  load_issue: {
    titleTemplate: "Load {{reference}} ISSUE",
    bodyTemplate: "{{issue_description}}",
    priority: "urgent",
    entityType: "load",
    permission: "loads",
    slackChannel: "load-alerts",
  },
};

// Helper to interpolate template strings
export function interpolateTemplate(
  template: string,
  data: Record<string, unknown>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = data[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}
