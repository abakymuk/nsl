/**
 * In-App Notification Channel
 * Inserts notifications into the database for real-time display
 */

import { createUntypedAdminClient } from "@/lib/supabase/server";
import { NotificationData } from "../types";

export interface InAppNotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/**
 * Send an in-app notification to an employee
 */
export async function sendInAppNotification(
  employeeId: string,
  notification: NotificationData
): Promise<InAppNotificationResult> {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: employeeId,
      event_type: notification.event,
      title: notification.title,
      body: notification.body || null,
      priority: notification.priority,
      entity_type: notification.entityType,
      entity_id: notification.entityId,
      metadata: notification.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert notification:", error);
    return { success: false, error: error.message };
  }

  return { success: true, notificationId: data.id };
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string
): Promise<boolean> {
  const supabase = createUntypedAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  return !error;
}

/**
 * Mark multiple notifications as read
 */
export async function markNotificationsRead(
  notificationIds: string[]
): Promise<boolean> {
  const supabase = createUntypedAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", notificationIds)
    .is("read_at", null);

  return !error;
}

/**
 * Mark all notifications as read for an employee
 */
export async function markAllNotificationsRead(
  employeeId: string
): Promise<boolean> {
  const supabase = createUntypedAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", employeeId)
    .is("read_at", null);

  return !error;
}

/**
 * Dismiss a notification (hide from view but keep in history)
 */
export async function dismissNotification(
  notificationId: string
): Promise<boolean> {
  const supabase = createUntypedAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", notificationId);

  return !error;
}

/**
 * Get unread notification count for an employee
 */
export async function getUnreadCount(employeeId: string): Promise<number> {
  const supabase = createUntypedAdminClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", employeeId)
    .is("read_at", null)
    .is("dismissed_at", null);

  if (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get recent notifications for an employee
 */
export async function getRecentNotifications(
  employeeId: string,
  limit: number = 10
): Promise<NotificationData[]> {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", employeeId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to get notifications:", error);
    return [];
  }

  return data || [];
}
