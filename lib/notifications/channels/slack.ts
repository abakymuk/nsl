/**
 * Slack Notification Channel
 * Sends notifications to Slack via webhooks
 */

import { NotificationData, NotificationPreferences, EVENT_CONFIGS } from "../types";

export interface SlackNotificationResult {
  success: boolean;
  error?: string;
}

/**
 * Build Slack message blocks for a notification
 */
function buildSlackBlocks(notification: NotificationData): object[] {
  const priorityEmoji = {
    low: "📝",
    normal: "📋",
    high: "⚠️",
    urgent: "🚨",
  }[notification.priority];

  const entityEmoji = {
    quote: "💰",
    load: "🚛",
    customer: "👤",
  }[notification.entityType];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com";

  // Build entity link
  let entityLink = "";
  let linkText = "";
  if (notification.entityType === "quote") {
    entityLink = `${siteUrl}/admin/quotes/${notification.entityId}`;
    linkText = "View Quote";
  } else if (notification.entityType === "load") {
    entityLink = `${siteUrl}/admin/loads/${notification.entityId}`;
    linkText = "View Load";
  }

  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${priorityEmoji} ${notification.title}`,
        emoji: true,
      },
    },
  ];

  // Add body if present
  if (notification.body) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: notification.body,
      },
    });
  }

  // Add metadata fields if present
  const metadata = notification.metadata || {};
  const fields: object[] = [];

  if (metadata.reference) {
    fields.push({
      type: "mrkdwn",
      text: `*Reference:*\n${metadata.reference}`,
    });
  }

  if (metadata.contact_name) {
    fields.push({
      type: "mrkdwn",
      text: `*Contact:*\n${metadata.contact_name}`,
    });
  }

  if (metadata.amount) {
    fields.push({
      type: "mrkdwn",
      text: `*Amount:*\n$${Number(metadata.amount).toLocaleString()}`,
    });
  }

  if (metadata.container) {
    fields.push({
      type: "mrkdwn",
      text: `*Container:*\n${metadata.container}`,
    });
  }

  if (fields.length > 0) {
    blocks.push({
      type: "section",
      fields,
    });
  }

  // Add action button if we have a link
  if (entityLink) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: `${entityEmoji} ${linkText}`,
            emoji: true,
          },
          url: entityLink,
          style: notification.priority === "urgent" ? "danger" : "primary",
        },
      ],
    });
  }

  // Add context (timestamp)
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Notification sent at ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} PT`,
      },
    ],
  });

  return blocks;
}

/**
 * Get webhook URL for the notification
 * Different events may route to different channels
 */
function getWebhookUrl(event: string): string | null {
  // Check for event-specific channel override in config
  const config = EVENT_CONFIGS[event as keyof typeof EVENT_CONFIGS];
  if (config?.slackChannel) {
    // Check for channel-specific webhook
    const channelWebhookKey = `SLACK_WEBHOOK_${config.slackChannel.toUpperCase().replace(/-/g, "_")}`;
    const channelWebhook = process.env[channelWebhookKey];
    if (channelWebhook) {
      return channelWebhook;
    }
  }

  // Fall back to main webhook
  return process.env.SLACK_WEBHOOK_URL || null;
}

/**
 * Send a Slack notification
 */
export async function sendSlackNotification(
  notification: NotificationData,
  preferences?: NotificationPreferences | null
): Promise<SlackNotificationResult> {
  // Check if Slack is enabled in preferences
  if (preferences && !preferences.channels.slack) {
    return { success: true }; // Skipped by preference
  }

  // Check event-specific override
  if (preferences?.event_settings[notification.event]?.slack === false) {
    return { success: true }; // Skipped by event preference
  }

  const webhookUrl = getWebhookUrl(notification.event);
  if (!webhookUrl) {
    // Slack not configured - skip silently
    return { success: true };
  }

  try {
    const blocks = buildSlackBlocks(notification);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: notification.title, // Fallback text
        blocks,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Slack webhook failed:", errorText);
      return { success: false, error: `Slack API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Slack send failed",
    };
  }
}

/**
 * Send a Slack thread reply (for related events)
 */
export async function sendSlackThreadReply(
  threadTs: string,
  notification: NotificationData
): Promise<SlackNotificationResult> {
  // Thread replies require the Slack API with a token, not webhooks
  // For now, just send as a new message
  // TODO: Implement proper thread replies with Slack API token
  return sendSlackNotification(notification);
}
