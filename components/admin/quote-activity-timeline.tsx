"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  MailOpen,
  Eye,
  FileCheck,
  PenTool,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Globe,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuoteActivityType } from "@/lib/notifications/types";

interface ActivityLog {
  activity_type: QuoteActivityType;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface QuoteActivityTimelineProps {
  quoteId: string;
  className?: string;
}

const activityConfig: Record<
  QuoteActivityType,
  {
    icon: typeof Mail;
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  email_sent: {
    icon: Mail,
    label: "Quote email sent",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  email_opened: {
    icon: MailOpen,
    label: "Email opened",
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
  },
  status_viewed: {
    icon: Eye,
    label: "Status page viewed",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  accept_page_viewed: {
    icon: FileCheck,
    label: "Accept page viewed",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  acceptance_started: {
    icon: PenTool,
    label: "Started filling form",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  accepted: {
    icon: CheckCircle,
    label: "Quote accepted",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  rejected: {
    icon: XCircle,
    label: "Quote rejected",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
};

function formatDateTime(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

function getDeviceType(userAgent: string | null): "mobile" | "desktop" | null {
  if (!userAgent) return null;
  const mobileKeywords = ["mobile", "android", "iphone", "ipad", "ipod"];
  const lowerUA = userAgent.toLowerCase();
  return mobileKeywords.some((k) => lowerUA.includes(k)) ? "mobile" : "desktop";
}

export function QuoteActivityTimeline({ quoteId, className }: QuoteActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch(`/api/admin/quotes/${quoteId}/activity`);
        if (!response.ok) {
          throw new Error("Failed to fetch activity");
        }
        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, [quoteId]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        {error}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-muted-foreground text-sm">No activity yet</p>
        <p className="text-muted-foreground text-xs mt-1">
          Activity will appear here once the quote email is sent
        </p>
      </div>
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce(
    (acc, activity) => {
      const { date } = formatDateTime(activity.created_at);
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(activity);
      return acc;
    },
    {} as Record<string, ActivityLog[]>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {Object.entries(groupedActivities).map(([date, dayActivities]) => (
        <div key={date}>
          <div className="sticky top-0 bg-card z-10 pb-2">
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
              {date}
            </span>
          </div>

          <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-4">
            {dayActivities.map((activity, idx) => {
              const config = activityConfig[activity.activity_type];
              if (!config) return null;

              const { time } = formatDateTime(activity.created_at);
              const Icon = config.icon;
              const deviceType = getDeviceType(activity.metadata?.user_agent as string);

              return (
                <div key={idx} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      "absolute -left-[31px] p-1.5 rounded-full",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{config.label}</span>
                      <span className="text-xs text-muted-foreground">{time}</span>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {deviceType && (
                        <span className="flex items-center gap-1">
                          {deviceType === "mobile" ? (
                            <Smartphone className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                          {deviceType === "mobile" ? "Mobile" : "Desktop"}
                        </span>
                      )}
                      {typeof activity.metadata?.ip_address === "string" && (
                        <span>IP: {activity.metadata.ip_address}</span>
                      )}
                    </div>

                    {/* Additional metadata for specific events */}
                    {activity.activity_type === "rejected" && typeof activity.metadata?.reason === "string" && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Reason: {activity.metadata.reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Compact inline version for quote detail page
export function QuoteActivitySummary({ quoteId }: { quoteId: string }) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const response = await fetch(`/api/admin/quotes/${quoteId}/activity`);
        if (response.ok) {
          const data = await response.json();
          setActivities(data.activities?.slice(0, 5) || []);
        }
      } catch {
        // Silently fail for summary view
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
  }, [quoteId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        No customer activity yet
      </div>
    );
  }

  // Show icons for recent activities
  return (
    <div className="flex items-center gap-1">
      {activities.map((activity, idx) => {
        const config = activityConfig[activity.activity_type];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <div
            key={idx}
            title={`${config.label} - ${new Date(activity.created_at).toLocaleString()}`}
            className={cn("p-1.5 rounded-full", config.bgColor)}
          >
            <Icon className={cn("h-3 w-3", config.color)} />
          </div>
        );
      })}
      {activities.length > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          {activities.length} event{activities.length !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
