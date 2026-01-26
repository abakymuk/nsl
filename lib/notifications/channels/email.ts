/**
 * Email Notification Channel
 * Sends notification emails via Resend
 */

import { createUntypedAdminClient } from "@/lib/supabase/server";
import { getResend } from "@/lib/resend";
import { NotificationData, NotificationPriority, NotificationPreferences } from "../types";

export interface EmailNotificationResult {
  success: boolean;
  queued?: boolean; // true if added to digest instead of immediate send
  error?: string;
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quiet_hours?.enabled) return false;

  const { start, end, timezone } = preferences.quiet_hours;
  if (!start || !end) return false;

  const tz = timezone || "America/Los_Angeles";
  const now = new Date();

  // Get current time in user's timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const currentTime = formatter.format(now);

  // Simple string comparison works for HH:MM format
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    // Overnight: quiet if current >= start OR current < end
    return currentTime >= start || currentTime < end;
  } else {
    // Same day: quiet if current >= start AND current < end
    return currentTime >= start && currentTime < end;
  }
}

/**
 * Check if notification meets priority threshold for immediate email
 */
function meetsPriorityThreshold(
  priority: NotificationPriority,
  threshold: NotificationPriority
): boolean {
  const levels: NotificationPriority[] = ["low", "normal", "high", "urgent"];
  return levels.indexOf(priority) >= levels.indexOf(threshold);
}

/**
 * Queue notification for daily digest
 */
async function queueForDigest(
  employeeId: string,
  notificationId: string
): Promise<boolean> {
  const supabase = createUntypedAdminClient();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9 AM next day

  const { error } = await supabase.from("notification_digest_queue").insert({
    employee_id: employeeId,
    notification_id: notificationId,
    scheduled_for: tomorrow.toISOString().split("T")[0],
  });

  return !error;
}

/**
 * Get employee email from their profile
 */
async function getEmployeeEmail(employeeId: string): Promise<string | null> {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("employees")
    .select("user_id, profiles!inner(email)")
    .eq("id", employeeId)
    .single();

  if (error || !data) return null;

  // @ts-expect-error - profiles is joined
  return data.profiles?.email || null;
}

/**
 * Send an email notification to an employee
 */
export async function sendEmailNotification(
  employeeId: string,
  notification: NotificationData,
  preferences: NotificationPreferences | null,
  notificationId?: string
): Promise<EmailNotificationResult> {
  // Check if email is enabled for this employee
  if (preferences && !preferences.channels.email) {
    return { success: true }; // Skipped by preference
  }

  // Check event-specific override
  if (preferences?.event_settings[notification.event]?.email === false) {
    return { success: true }; // Skipped by event preference
  }

  // Check quiet hours - urgent notifications bypass quiet hours
  if (
    preferences &&
    isInQuietHours(preferences) &&
    notification.priority !== "urgent"
  ) {
    // Queue for digest if we have a notification ID
    if (notificationId) {
      await queueForDigest(employeeId, notificationId);
    }
    return { success: true, queued: true };
  }

  // Check priority threshold for immediate email
  const threshold = preferences?.email_priority_threshold || "high";
  if (!meetsPriorityThreshold(notification.priority, threshold)) {
    // Queue for digest if we have a notification ID
    if (notificationId) {
      await queueForDigest(employeeId, notificationId);
    }
    return { success: true, queued: true };
  }

  // Get employee email
  const email = await getEmployeeEmail(employeeId);
  if (!email) {
    return { success: false, error: "Employee email not found" };
  }

  try {
    const fromEmail = process.env.EMAIL_FROM || "noreply@newstreamlogistics.com";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com";

    // Build entity link
    let entityLink = "";
    if (notification.entityType === "quote") {
      entityLink = `${siteUrl}/admin/quotes/${notification.entityId}`;
    } else if (notification.entityType === "load") {
      entityLink = `${siteUrl}/admin/loads/${notification.entityId}`;
    }

    const priorityEmoji = {
      low: "",
      normal: "",
      high: "⚠️ ",
      urgent: "🚨 ",
    }[notification.priority];

    await getResend().emails.send({
      from: fromEmail,
      to: email,
      subject: `${priorityEmoji}${notification.title} - New Stream Logistics`,
      text: `
${notification.title}

${notification.body || ""}

${entityLink ? `View details: ${entityLink}` : ""}

---
New Stream Logistics
You can manage your notification preferences in your admin settings.
      `.trim(),
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send notification email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Email send failed",
    };
  }
}

/**
 * Send daily digest email to an employee
 */
export async function sendDigestEmail(employeeId: string): Promise<boolean> {
  const supabase = createUntypedAdminClient();

  // Get pending digest items for today
  const today = new Date().toISOString().split("T")[0];
  const { data: digestItems, error: digestError } = await supabase
    .from("notification_digest_queue")
    .select(
      `
      id,
      notification:notifications(
        id, event_type, title, body, priority, entity_type, entity_id, created_at
      )
    `
    )
    .eq("employee_id", employeeId)
    .eq("scheduled_for", today)
    .is("sent_at", null);

  if (digestError || !digestItems?.length) {
    return true; // Nothing to send
  }

  const email = await getEmployeeEmail(employeeId);
  if (!email) return false;

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com";
    const fromEmail = process.env.EMAIL_FROM || "noreply@newstreamlogistics.com";

    // Build digest content
    type DigestNotification = {
      id: string;
      event_type: string;
      title: string;
      body?: string;
      priority: string;
      entity_type?: string;
      entity_id?: string;
      created_at: string;
    };

    const notifications = digestItems
      .filter((item) => item.notification)
      .map((item) => item.notification as unknown as DigestNotification);

    const digestContent = notifications
      .map((n) => {
        let link = "";
        if (n.entity_type === "quote") {
          link = `\n  View: ${siteUrl}/admin/quotes/${n.entity_id}`;
        } else if (n.entity_type === "load") {
          link = `\n  View: ${siteUrl}/admin/loads/${n.entity_id}`;
        }
        return `• ${n.title}${n.body ? `\n  ${n.body}` : ""}${link}`;
      })
      .join("\n\n");

    await getResend().emails.send({
      from: fromEmail,
      to: email,
      subject: `Daily Digest: ${notifications.length} notification${notifications.length > 1 ? "s" : ""} - New Stream Logistics`,
      text: `
Your Daily Notification Digest
==============================

${digestContent}

---
View all notifications: ${siteUrl}/admin/notifications
Manage preferences: ${siteUrl}/admin/settings/notifications

New Stream Logistics
      `.trim(),
    });

    // Mark items as sent
    const itemIds = digestItems.map((item) => item.id);
    await supabase
      .from("notification_digest_queue")
      .update({ sent_at: new Date().toISOString() })
      .in("id", itemIds);

    return true;
  } catch (error) {
    console.error("Failed to send digest email:", error);
    return false;
  }
}
