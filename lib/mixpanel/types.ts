/**
 * Mixpanel type definitions
 */

export interface MixpanelUserProperties {
  $email?: string;
  $name?: string;
  $phone?: string;
  organization_id?: string;
  organization_name?: string;
  user_role?: string;
  created_at?: string;
}

export interface MixpanelEventProperties {
  // Common properties
  path?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;

  // Quote events
  request_type?: string;
  port?: string;
  container_number?: string;
  terminal?: string;
  zip_code?: string;
  container_type?: string;
  time_sensitive?: boolean;
  step?: number;
  quote_id?: string;
  amount?: number;

  // Track events
  status?: string;
  type?: string;

  // Dashboard events
  section?: string;
  quote_count?: number;

  // Auth events
  method?: string;

  // Generic
  [key: string]: string | number | boolean | undefined;
}

export type MixpanelEventName =
  | "page_view"
  | "quote_view"
  | "quote_started"
  | "quote_step_completed"
  | "quote_submitted"
  | "quote_submit_success"
  | "quote_submit_error"
  | "quote_accepted"
  | "quote_declined"
  | "track_searched"
  | "track_result_viewed"
  | "track_not_found"
  | "dashboard_viewed"
  | "dashboard_quotes_viewed"
  | "sign_up"
  | "login"
  | "logout"
  | "price_estimate_viewed"
  | string;
