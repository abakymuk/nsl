/**
 * Notification System
 *
 * Comprehensive notification module for employee alerts
 * Supports in-app, email, and Slack channels
 */

export * from "./types";
export { dispatch, notifyDirect, buildNotification } from "./dispatcher";
export {
  sendInAppNotification,
  markNotificationRead,
  markNotificationsRead,
  markAllNotificationsRead,
  dismissNotification,
  getUnreadCount,
  getRecentNotifications,
} from "./channels/in-app";
export { sendSlackNotification } from "./channels/slack";
export { sendEmailNotification, sendDigestEmail } from "./channels/email";

// Re-export commonly used functions with shorter names
import { dispatch } from "./dispatcher";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { QuoteActivityType } from "./types";

/**
 * Main notification function - dispatch to appropriate employees
 *
 * @example
 * ```ts
 * await notify("quote_accepted", quoteId, {
 *   reference: "Q-12345",
 *   contact_name: "John Smith",
 *   amount: 1500
 * });
 * ```
 */
export const notify = dispatch;

/**
 * Log customer activity on a quote
 * This creates an activity log entry AND triggers notifications to assigned employee
 */
export async function logQuoteActivity(
  quoteId: string,
  activityType: QuoteActivityType,
  options?: {
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
    skipNotification?: boolean;
  }
): Promise<{ success: boolean; activityId?: string }> {
  const supabase = createUntypedAdminClient();

  // Insert activity log
  const { data, error } = await supabase
    .from("quote_activity_log")
    .insert({
      quote_id: quoteId,
      activity_type: activityType,
      ip_address: options?.ipAddress || null,
      user_agent: options?.userAgent || null,
      metadata: options?.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to log quote activity:", error);
    return { success: false };
  }

  // Trigger notification (unless explicitly skipped)
  if (!options?.skipNotification) {
    // Map activity type to notification event
    const eventMap: Record<QuoteActivityType, string | null> = {
      email_sent: null, // Don't notify on email sent (admin initiated)
      email_opened: "quote_email_opened",
      status_viewed: "quote_status_viewed",
      accept_page_viewed: "quote_accept_page_viewed",
      acceptance_started: "quote_acceptance_started",
      accepted: "quote_accepted",
      rejected: "quote_rejected",
    };

    const notificationEvent = eventMap[activityType];

    if (notificationEvent) {
      // Get quote details for notification
      const { data: quote } = await supabase
        .from("quotes")
        .select("reference_number, contact_name, total_price, quoted_price, rejection_reason")
        .eq("id", quoteId)
        .single();

      if (quote) {
        await dispatch(notificationEvent as Parameters<typeof dispatch>[0], quoteId, {
          reference: quote.reference_number,
          contact_name: quote.contact_name || "Customer",
          amount: quote.total_price || quote.quoted_price,
          reason: quote.rejection_reason,
          ...options?.metadata,
        });
      }
    }
  }

  return { success: true, activityId: data.id };
}

/**
 * Get quote activity timeline
 */
export async function getQuoteActivityTimeline(
  quoteId: string,
  limit: number = 50
): Promise<{ activity_type: QuoteActivityType; created_at: string; metadata: Record<string, unknown> }[]> {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("quote_activity_log")
    .select("activity_type, created_at, metadata")
    .eq("quote_id", quoteId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to get quote activity:", error);
    return [];
  }

  return data || [];
}
