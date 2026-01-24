"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Settings,
  Check,
  CheckCheck,
  Trash2,
  FileText,
  Truck,
  Users,
  Filter,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationPreferences } from "@/components/admin/notification-preferences";
import type {
  Notification,
  NotificationPriority,
  NotificationEntityType,
} from "@/lib/notifications/types";

const priorityColors: Record<NotificationPriority, string> = {
  low: "bg-muted",
  normal: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-red-500",
};

const priorityLabels: Record<NotificationPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const entityIcons: Record<NotificationEntityType, typeof FileText> = {
  quote: FileText,
  load: Truck,
  customer: Users,
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

type Tab = "all" | "preferences";

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "50",
        offset: "0",
        ...(filter === "unread" ? { unread_only: "true" } : {}),
      });
      const response = await fetch(`/api/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (tab === "all") {
      fetchNotifications();
    }
  }, [tab, fetchNotifications]);

  const handleAction = async (action: "read" | "dismiss", ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (action === "dismiss") {
        setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
      } else {
        setNotifications((prev) =>
          prev.map((n) =>
            ids.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
      }
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to update notifications:", error);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const getEntityLink = (notification: Notification): string | null => {
    if (!notification.entity_type || !notification.entity_id) return null;
    if (notification.entity_type === "quote") {
      return `/admin/quotes/${notification.entity_id}`;
    }
    if (notification.entity_type === "load") {
      return `/admin/loads/${notification.entity_id}`;
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {total} notification{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit mb-6">
        <button
          onClick={() => setTab("all")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            tab === "all"
              ? "bg-card shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bell className="h-4 w-4" />
          All Notifications
        </button>
        <button
          onClick={() => setTab("preferences")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            tab === "preferences"
              ? "bg-card shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Preferences
        </button>
      </div>

      {tab === "all" ? (
        <>
          {/* Actions Bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilter(filter === "all" ? "unread" : "all")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  filter === "unread"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                <Filter className="h-4 w-4" />
                {filter === "unread" ? "Unread only" : "All notifications"}
              </button>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => handleAction("read", Array.from(selectedIds))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-muted hover:bg-muted/80"
                >
                  <Check className="h-4 w-4" />
                  Mark read
                </button>
                <button
                  onClick={() => handleAction("dismiss", Array.from(selectedIds))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-destructive/10 text-destructive hover:bg-destructive/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Dismiss
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="bg-card rounded-xl border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <>
                {/* Select All Header */}
                <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === notifications.length}
                    onChange={selectAll}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-xs text-muted-foreground">Select all</span>
                  {notifications.some((n) => !n.read_at) && (
                    <button
                      onClick={() =>
                        handleAction(
                          "read",
                          notifications.filter((n) => !n.read_at).map((n) => n.id)
                        )
                      }
                      className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const EntityIcon =
                      entityIcons[notification.entity_type as NotificationEntityType] || FileText;
                    const link = getEntityLink(notification);

                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          "relative flex items-start gap-4 px-4 py-4 hover:bg-muted/30 transition-colors",
                          !notification.read_at && "bg-primary/5"
                        )}
                      >
                        {/* Priority indicator */}
                        <div
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-1",
                            priorityColors[notification.priority as NotificationPriority]
                          )}
                        />

                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(notification.id)}
                          onChange={() => toggleSelect(notification.id)}
                          className="h-4 w-4 rounded mt-1"
                        />

                        {/* Icon */}
                        <div className="shrink-0">
                          <EntityIcon className="h-5 w-5 text-muted-foreground" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p
                                className={cn(
                                  "text-sm",
                                  !notification.read_at && "font-medium"
                                )}
                              >
                                {notification.title}
                              </p>
                              {notification.body && (
                                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                  {notification.body}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={cn(
                                  "text-xs px-2 py-0.5 rounded-full",
                                  notification.priority === "urgent"
                                    ? "bg-red-500/10 text-red-500"
                                    : notification.priority === "high"
                                      ? "bg-amber-500/10 text-amber-600"
                                      : "bg-muted text-muted-foreground"
                                )}
                              >
                                {priorityLabels[notification.priority as NotificationPriority]}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            {link && (
                              <Link
                                href={link}
                                className="text-xs text-primary hover:underline"
                              >
                                View details →
                              </Link>
                            )}
                            {!notification.read_at && (
                              <button
                                onClick={() => handleAction("read", [notification.id])}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={() => handleAction("dismiss", [notification.id])}
                              className="text-xs text-muted-foreground hover:text-destructive"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>

                        {/* Unread indicator */}
                        {!notification.read_at && (
                          <div className="shrink-0">
                            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="bg-card rounded-xl border p-6">
          <NotificationPreferences />
        </div>
      )}
    </div>
  );
}
