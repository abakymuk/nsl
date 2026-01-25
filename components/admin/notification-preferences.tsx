"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, MessageSquare, Moon, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  NotificationChannel,
  NotificationEvent,
  NotificationPriority,
} from "@/lib/notifications/types";

interface NotificationPreferences {
  channels: Record<NotificationChannel, boolean>;
  event_settings: Partial<Record<NotificationEvent, Partial<Record<NotificationChannel, boolean>>>>;
  quiet_hours: {
    enabled: boolean;
    start?: string;
    end?: string;
    timezone?: string;
  };
  email_priority_threshold: NotificationPriority;
}

const CHANNELS: { key: NotificationChannel; label: string; icon: typeof Bell; description: string }[] = [
  { key: "in_app", label: "In-App", icon: Bell, description: "Notifications in the admin panel" },
  { key: "email", label: "Email", icon: Mail, description: "Email notifications" },
  { key: "slack", label: "Slack", icon: MessageSquare, description: "Slack channel notifications" },
];

const EVENT_GROUPS = [
  {
    title: "Quote Journey",
    events: [
      { key: "quote_email_opened" as NotificationEvent, label: "Customer opened email" },
      { key: "quote_status_viewed" as NotificationEvent, label: "Customer viewed status page" },
      { key: "quote_accept_page_viewed" as NotificationEvent, label: "Customer viewing accept page" },
      { key: "quote_acceptance_started" as NotificationEvent, label: "Customer started form" },
      { key: "quote_accepted" as NotificationEvent, label: "Quote accepted" },
      { key: "quote_rejected" as NotificationEvent, label: "Quote rejected" },
      { key: "quote_expiring_soon" as NotificationEvent, label: "Quote expiring soon" },
    ],
  },
  {
    title: "Quote Admin",
    events: [
      { key: "quote_submitted" as NotificationEvent, label: "New quote request" },
      { key: "quote_assigned" as NotificationEvent, label: "Quote assigned" },
      { key: "quote_sent" as NotificationEvent, label: "Quote sent to customer" },
    ],
  },
  {
    title: "Loads",
    events: [
      { key: "load_status_changed" as NotificationEvent, label: "Load status changed" },
      { key: "load_delayed" as NotificationEvent, label: "Load delayed" },
      { key: "load_delivered" as NotificationEvent, label: "Load delivered" },
      { key: "load_issue" as NotificationEvent, label: "Load issue reported" },
    ],
  },
];

const PRIORITY_OPTIONS: { value: NotificationPriority; label: string; description: string }[] = [
  { value: "low", label: "All", description: "Get all notifications via email" },
  { value: "normal", label: "Normal+", description: "Normal, high, and urgent notifications" },
  { value: "high", label: "High+ (Recommended)", description: "Only high and urgent notifications" },
  { value: "urgent", label: "Urgent only", description: "Only urgent notifications" },
];

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
];

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    channels: { in_app: true, email: true, slack: true },
    event_settings: {},
    quiet_hours: { enabled: false, start: "22:00", end: "08:00", timezone: "America/Los_Angeles" },
    email_priority_threshold: "high",
  });

  // Fetch preferences
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch("/api/notifications/preferences");
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
        }
      } catch (error) {
        console.error("Failed to fetch preferences:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPreferences();
  }, []);

  // Save preferences
  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      if (!response.ok) {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  // Toggle channel
  const toggleChannel = (channel: NotificationChannel) => {
    setPreferences((prev) => ({
      ...prev,
      channels: { ...prev.channels, [channel]: !prev.channels[channel] },
    }));
  };

  // Toggle event for channel
  const toggleEventChannel = (event: NotificationEvent, channel: NotificationChannel) => {
    setPreferences((prev) => {
      const currentEventSettings = prev.event_settings[event] || {};
      const currentValue = currentEventSettings[channel] ?? prev.channels[channel];
      return {
        ...prev,
        event_settings: {
          ...prev.event_settings,
          [event]: { ...currentEventSettings, [channel]: !currentValue },
        },
      };
    });
  };

  // Get effective value for event channel
  const getEventChannelValue = (event: NotificationEvent, channel: NotificationChannel): boolean => {
    return preferences.event_settings[event]?.[channel] ?? preferences.channels[channel];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Global Channel Settings */}
      <section>
        <h3 className="text-lg font-medium mb-4">Notification Channels</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {CHANNELS.map((channel) => (
            <button
              key={channel.key}
              onClick={() => toggleChannel(channel.key)}
              className={cn(
                "flex flex-col items-start p-4 rounded-lg border transition-colors text-left",
                preferences.channels[channel.key]
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <channel.icon className="h-5 w-5" />
                <span className="font-medium">{channel.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{channel.description}</p>
              <div
                className={cn(
                  "mt-3 w-10 h-6 rounded-full transition-colors relative",
                  preferences.channels[channel.key] ? "bg-primary" : "bg-muted"
                )}
              >
                <div
                  className={cn(
                    "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                    preferences.channels[channel.key] ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Email Priority Threshold */}
      <section>
        <h3 className="text-lg font-medium mb-2">Email Priority Threshold</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Lower priority notifications will be batched into a daily digest
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() =>
                setPreferences((prev) => ({ ...prev, email_priority_threshold: option.value }))
              }
              className={cn(
                "p-3 rounded-lg border text-left transition-colors",
                preferences.email_priority_threshold === option.value
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/30"
              )}
            >
              <p className="font-medium text-sm">{option.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Quiet Hours */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Moon className="h-5 w-5" />
          <h3 className="text-lg font-medium">Quiet Hours</h3>
        </div>
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-sm text-muted-foreground">
                Delay non-urgent notifications during specified hours
              </p>
            </div>
            <button
              onClick={() =>
                setPreferences((prev) => ({
                  ...prev,
                  quiet_hours: { ...prev.quiet_hours, enabled: !prev.quiet_hours.enabled },
                }))
              }
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                preferences.quiet_hours.enabled ? "bg-primary" : "bg-muted"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                  preferences.quiet_hours.enabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {preferences.quiet_hours.enabled && (
            <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours.start || "22:00"}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      quiet_hours: { ...prev.quiet_hours, start: e.target.value },
                    }))
                  }
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <input
                  type="time"
                  value={preferences.quiet_hours.end || "08:00"}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      quiet_hours: { ...prev.quiet_hours, end: e.target.value },
                    }))
                  }
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Timezone</label>
                <select
                  value={preferences.quiet_hours.timezone || "America/Los_Angeles"}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      quiet_hours: { ...prev.quiet_hours, timezone: e.target.value },
                    }))
                  }
                  className="mt-1 w-full px-3 py-2 border rounded-lg bg-background"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Per-Event Settings */}
      <section>
        <h3 className="text-lg font-medium mb-4">Event Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Override channel settings for specific events
        </p>
        <div className="space-y-6">
          {EVENT_GROUPS.map((group) => (
            <div key={group.title} className="rounded-lg border">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h4 className="font-medium">{group.title}</h4>
              </div>
              <div className="divide-y">
                {group.events.map((event) => (
                  <div key={event.key} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-sm">{event.label}</span>
                    <div className="flex items-center gap-2">
                      {CHANNELS.map((channel) => (
                        <button
                          key={channel.key}
                          onClick={() => toggleEventChannel(event.key, channel.key)}
                          disabled={!preferences.channels[channel.key]}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            !preferences.channels[channel.key]
                              ? "opacity-30 cursor-not-allowed"
                              : getEventChannelValue(event.key, channel.key)
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                          title={`${channel.label}: ${getEventChannelValue(event.key, channel.key) ? "On" : "Off"}`}
                        >
                          <channel.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Save Button */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 shadow-lg"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Preferences
        </button>
      </div>
    </div>
  );
}
