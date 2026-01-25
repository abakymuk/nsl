/**
 * Notification Dispatcher
 * Coordinates sending notifications across all channels
 */

import { createUntypedAdminClient } from "@/lib/supabase/server";
import {
  NotificationData,
  NotificationEvent,
  NotificationPreferences,
  EVENT_CONFIGS,
  interpolateTemplate,
} from "./types";
import { sendInAppNotification } from "./channels/in-app";
import { sendEmailNotification } from "./channels/email";
import { sendSlackNotification } from "./channels/slack";

export interface DispatchResult {
  success: boolean;
  employeesNotified: number;
  channels: {
    inApp: { sent: number; failed: number };
    email: { sent: number; queued: number; failed: number };
    slack: { sent: number; failed: number };
  };
  errors?: string[];
}

/**
 * Get employee preferences, or create default if not exists
 */
async function getEmployeePreferences(
  employeeId: string
): Promise<NotificationPreferences | null> {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("employee_id", employeeId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found
    console.error("Error fetching preferences:", error);
  }

  return data as NotificationPreferences | null;
}

/**
 * Get employees with a specific permission
 */
async function getEmployeesWithPermission(permission: string): Promise<string[]> {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("is_active", true)
    .contains("permissions", [permission]);

  if (error) {
    console.error("Error fetching employees:", error);
    return [];
  }

  return (data || []).map((e) => e.id);
}

/**
 * Get all super admin employee IDs
 * Super admins should receive all notifications regardless of employee permissions
 */
async function getSuperAdminEmployeeIds(): Promise<string[]> {
  const supabase = createUntypedAdminClient();

  // Get all super admin user IDs from profiles
  const { data: superAdmins, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "super_admin");

  if (profileError) {
    console.error("Error fetching super admins:", profileError);
    return [];
  }

  if (!superAdmins || superAdmins.length === 0) {
    return [];
  }

  // Get employee records for these users
  const userIds = superAdmins.map((a) => a.id);
  const { data: employees, error: empError } = await supabase
    .from("employees")
    .select("id")
    .in("user_id", userIds)
    .eq("is_active", true);

  if (empError) {
    console.error("Error fetching super admin employees:", empError);
    return [];
  }

  return (employees || []).map((e) => e.id);
}

/**
 * Get all notification recipients (employees with permission + super admins)
 */
async function getNotificationRecipients(permission: string): Promise<string[]> {
  const [employees, superAdmins] = await Promise.all([
    getEmployeesWithPermission(permission),
    getSuperAdminEmployeeIds(),
  ]);

  console.log("[getNotificationRecipients]", { permission, employees, superAdmins });

  // Combine and dedupe
  const allIds = new Set([...employees, ...superAdmins]);
  return Array.from(allIds);
}

/**
 * Get the employee assigned to a quote
 */
async function getQuoteAssignee(quoteId: string): Promise<string | null> {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("quotes")
    .select("assignee_id")
    .eq("id", quoteId)
    .single();

  if (error || !data?.assignee_id) {
    return null;
  }

  // Get the employee record for this user
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", data.assignee_id)
    .single();

  return employee?.id || null;
}

/**
 * Get the employee assigned to a load
 */
async function getLoadAssignee(loadId: string): Promise<string | null> {
  const supabase = createUntypedAdminClient();

  const { data, error } = await supabase
    .from("loads")
    .select("assignee_id")
    .eq("id", loadId)
    .single();

  if (error || !data?.assignee_id) {
    return null;
  }

  // Get the employee record for this user
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("user_id", data.assignee_id)
    .single();

  return employee?.id || null;
}

/**
 * Build notification from event and data
 */
export function buildNotification(
  event: NotificationEvent,
  entityId: string,
  data: Record<string, unknown>
): NotificationData {
  const config = EVENT_CONFIGS[event];

  return {
    event,
    title: interpolateTemplate(config.titleTemplate, data),
    body: config.bodyTemplate
      ? interpolateTemplate(config.bodyTemplate, data)
      : undefined,
    priority: config.priority,
    entityType: config.entityType,
    entityId,
    metadata: data,
  };
}

/**
 * Send notification to a single employee across all channels
 */
async function notifyEmployee(
  employeeId: string,
  notification: NotificationData
): Promise<{
  inApp: boolean;
  email: boolean | "queued";
  slack: boolean;
  notificationId?: string;
}> {
  const preferences = await getEmployeePreferences(employeeId);

  // Always send in-app notification
  const inAppResult = await sendInAppNotification(employeeId, notification);

  // Send email (may be queued for digest)
  const emailResult = await sendEmailNotification(
    employeeId,
    notification,
    preferences,
    inAppResult.notificationId
  );

  // Send Slack (shared channel, not per-employee)
  // Only send Slack once per notification event, not per employee
  // This will be handled at the dispatch level

  return {
    inApp: inAppResult.success,
    email: emailResult.queued ? "queued" : emailResult.success,
    slack: true, // Handled separately
    notificationId: inAppResult.notificationId,
  };
}

/**
 * Main dispatch function - send notification based on event type
 */
export async function dispatch(
  event: NotificationEvent,
  entityId: string,
  data: Record<string, unknown>
): Promise<DispatchResult> {
  console.log("[Notification Dispatch] Starting:", { event, entityId, data });

  const config = EVENT_CONFIGS[event];
  const notification = buildNotification(event, entityId, data);

  const result: DispatchResult = {
    success: true,
    employeesNotified: 0,
    channels: {
      inApp: { sent: 0, failed: 0 },
      email: { sent: 0, queued: 0, failed: 0 },
      slack: { sent: 0, failed: 0 },
    },
    errors: [],
  };

  // Get target employees based on event type and assignment
  let targetEmployees: string[] = [];

  // For new quote submissions, always notify all employees + super admins
  if (event === "quote_submitted") {
    targetEmployees = await getNotificationRecipients(config.permission);
    console.log("[Notification Dispatch] quote_submitted recipients:", targetEmployees);
  } else if (config.entityType === "quote") {
    // For other quote events, notify assigned employee or all if unassigned
    const assignee = await getQuoteAssignee(entityId);
    if (assignee) {
      // Also include super admins for important quote events
      const superAdmins = await getSuperAdminEmployeeIds();
      targetEmployees = Array.from(new Set([assignee, ...superAdmins]));
    } else {
      // No assignee - notify all with quotes permission + super admins
      targetEmployees = await getNotificationRecipients(config.permission);
    }
  } else if (config.entityType === "load") {
    // For loads, notify only the assigned employee
    const assignee = await getLoadAssignee(entityId);
    if (assignee) {
      targetEmployees = [assignee];
    } else {
      // No assignee - notify all with loads permission + super admins
      targetEmployees = await getNotificationRecipients(config.permission);
    }
  } else {
    // For other entity types, notify all with required permission + super admins
    targetEmployees = await getNotificationRecipients(config.permission);
  }

  // Send to each employee
  for (const employeeId of targetEmployees) {
    try {
      const employeeResult = await notifyEmployee(employeeId, notification);

      if (employeeResult.inApp) {
        result.channels.inApp.sent++;
      } else {
        result.channels.inApp.failed++;
      }

      if (employeeResult.email === true) {
        result.channels.email.sent++;
      } else if (employeeResult.email === "queued") {
        result.channels.email.queued++;
      } else {
        result.channels.email.failed++;
      }

      result.employeesNotified++;
    } catch (error) {
      console.error(`Failed to notify employee ${employeeId}:`, error);
      result.errors?.push(`Employee ${employeeId}: ${error}`);
    }
  }

  // Send Slack notification once (not per employee)
  const slackResult = await sendSlackNotification(notification);
  if (slackResult.success) {
    result.channels.slack.sent = 1;
  } else {
    result.channels.slack.failed = 1;
    if (slackResult.error) {
      result.errors?.push(`Slack: ${slackResult.error}`);
    }
  }

  result.success = result.employeesNotified > 0 || result.channels.slack.sent > 0;

  return result;
}

/**
 * Direct notification to specific employee
 */
export async function notifyDirect(
  employeeId: string,
  notification: NotificationData
): Promise<DispatchResult> {
  const result: DispatchResult = {
    success: false,
    employeesNotified: 0,
    channels: {
      inApp: { sent: 0, failed: 0 },
      email: { sent: 0, queued: 0, failed: 0 },
      slack: { sent: 0, failed: 0 },
    },
    errors: [],
  };

  try {
    const employeeResult = await notifyEmployee(employeeId, notification);

    if (employeeResult.inApp) {
      result.channels.inApp.sent++;
    } else {
      result.channels.inApp.failed++;
    }

    if (employeeResult.email === true) {
      result.channels.email.sent++;
    } else if (employeeResult.email === "queued") {
      result.channels.email.queued++;
    } else {
      result.channels.email.failed++;
    }

    result.employeesNotified = 1;
    result.success = true;
  } catch (error) {
    console.error(`Failed to notify employee ${employeeId}:`, error);
    result.errors?.push(`${error}`);
  }

  return result;
}
