/**
 * Sync Monitoring and Alerting
 * Provides metrics and Slack notifications for sync health
 */

import { createClient } from "@supabase/supabase-js";
import { getDeadLetterStats } from "@/lib/webhook-dlq";
import { captureError, log } from "@/lib/sentry";

export type AlertType =
  | "dlq_overflow"
  | "high_failure_rate"
  | "reconciliation_drift"
  | "sync_stale";

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * Send alert to Slack webhook
 */
export async function sendSlackAlert(
  type: AlertType,
  details: Record<string, unknown>
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    log.warn("Slack alerting disabled: SLACK_WEBHOOK_URL not configured");
    return false;
  }

  const alertConfig = getAlertConfig(type, details);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: alertConfig.fallbackText,
        blocks: alertConfig.blocks,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      captureError(new Error(`Slack alert failed: ${errorText}`), {
        tags: { source: "sync-monitoring", alert_type: type },
      });
      return false;
    }

    log.info("Slack alert sent", { type });
    return true;
  } catch (error) {
    captureError(error, { tags: { source: "sync-monitoring", operation: "send-slack-alert" } });
    return false;
  }
}

function getAlertConfig(
  type: AlertType,
  details: Record<string, unknown>
): { fallbackText: string; blocks: SlackBlock[] } {
  const timestamp = details.timestamp || new Date().toISOString();

  switch (type) {
    case "dlq_overflow":
      return {
        fallbackText: `⚠️ PortPro DLQ Alert: ${details.count} failed webhooks`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "⚠️ PortPro Dead Letter Queue Alert",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Failed Webhooks:*\n${details.count}` },
              {
                type: "mrkdwn",
                text: `*Max Retries Reached:*\n${details.maxRetriesReached}`,
              },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*By Event Type:*\n\`\`\`${JSON.stringify(details.byEventType, null, 2)}\`\`\``,
            },
          },
          {
            type: "context",
            text: {
              type: "mrkdwn",
              text: `🕐 ${timestamp}`,
            },
          },
        ],
      };

    case "high_failure_rate":
      return {
        fallbackText: `🚨 PortPro High Failure Rate: ${details.rate}%`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚨 PortPro High Webhook Failure Rate",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Failure Rate:*\n${details.rate}%` },
              { type: "mrkdwn", text: `*Period:*\n${details.period}` },
              { type: "mrkdwn", text: `*Failed:*\n${details.failed}` },
              { type: "mrkdwn", text: `*Total:*\n${details.total}` },
            ],
          },
          {
            type: "context",
            text: {
              type: "mrkdwn",
              text: `🕐 ${timestamp}`,
            },
          },
        ],
      };

    case "reconciliation_drift":
      return {
        fallbackText: `⚠️ PortPro Reconciliation: ${details.discrepancies || "Error"}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "⚠️ PortPro Reconciliation Alert",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: details.error
                ? `*Error:* ${details.error}`
                : `*Discrepancies Found:* ${details.discrepancies} out of ${details.total} loads`,
            },
          },
          {
            type: "context",
            text: {
              type: "mrkdwn",
              text: `🕐 ${timestamp}`,
            },
          },
        ],
      };

    case "sync_stale":
      return {
        fallbackText: `⚠️ PortPro Sync Stale: No sync in ${details.hours} hours`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "⚠️ PortPro Sync Stale",
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `No successful sync in *${details.hours}* hours.\nLast sync: ${details.lastSync || "Unknown"}`,
            },
          },
          {
            type: "context",
            text: {
              type: "mrkdwn",
              text: `🕐 ${timestamp}`,
            },
          },
        ],
      };

    default:
      return {
        fallbackText: `PortPro Alert: ${type}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Alert Type:* ${type}\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
            },
          },
        ],
      };
  }
}

/**
 * Get sync health metrics
 */
export async function getSyncMetrics(): Promise<{
  webhooksLast24h: {
    total: number;
    failed: number;
    rate: number;
  };
  dlq: {
    count: number;
    maxRetriesReached: number;
  };
  lastReconciliation: {
    time: string | null;
    discrepancies: number;
    status: string | null;
  };
  health: "healthy" | "degraded" | "critical";
  issues: string[];
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const issues: string[] = [];

  // Get webhook logs from last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { data: webhookLogs } = await supabase
    .from("portpro_webhook_logs")
    .select("id")
    .gte("created_at", yesterday.toISOString());

  const totalWebhooks = webhookLogs?.length || 0;

  // Get DLQ stats
  const dlqStats = await getDeadLetterStats();

  // Get last reconciliation
  const { data: lastSync } = await supabase
    .from("sync_status")
    .select("started_at, status, metadata")
    .eq("sync_type", "reconcile")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  // Calculate health
  let health: "healthy" | "degraded" | "critical" = "healthy";

  if (dlqStats.count > 50) {
    health = "critical";
    issues.push(`DLQ has ${dlqStats.count} failed webhooks`);
  } else if (dlqStats.count > 20) {
    health = "degraded";
    issues.push(`DLQ has ${dlqStats.count} failed webhooks`);
  }

  if (dlqStats.maxRetriesReached > 10) {
    health = "critical";
    issues.push(`${dlqStats.maxRetriesReached} webhooks reached max retries`);
  }

  const lastSyncTime = lastSync?.started_at ? new Date(lastSync.started_at) : null;
  if (lastSyncTime) {
    const hoursSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSync > 8) {
      health = health === "critical" ? "critical" : "degraded";
      issues.push(`No reconciliation in ${Math.round(hoursSinceSync)} hours`);
    }
  }

  return {
    webhooksLast24h: {
      total: totalWebhooks,
      failed: dlqStats.count,
      rate: totalWebhooks > 0 ? Math.round((dlqStats.count / totalWebhooks) * 100) : 0,
    },
    dlq: {
      count: dlqStats.count,
      maxRetriesReached: dlqStats.maxRetriesReached,
    },
    lastReconciliation: {
      time: lastSync?.started_at || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      discrepancies: (lastSync?.metadata as any)?.discrepancies || 0,
      status: lastSync?.status || null,
    },
    health,
    issues,
  };
}

/**
 * Check sync health and return status
 */
export async function checkSyncHealth(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const metrics = await getSyncMetrics();
  return {
    healthy: metrics.health === "healthy",
    issues: metrics.issues,
  };
}
