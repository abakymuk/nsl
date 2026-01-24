"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  CheckCheck,
  X,
  FileText,
  Truck,
  Users,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification, NotificationPriority, NotificationEntityType } from "@/lib/notifications/types";

interface NotificationCenterProps {
  employeeId: string;
  className?: string;
}

const priorityColors: Record<NotificationPriority, string> = {
  low: "bg-muted",
  normal: "bg-blue-500",
  high: "bg-amber-500",
  urgent: "bg-red-500",
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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationCenter({ employeeId, className }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", employeeId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Failed to fetch notifications:", error);
      return;
    }

    const typedData = (data || []) as unknown as Notification[];
    setNotifications(typedData);
    setUnreadCount(typedData.filter((n) => !n.read_at).length);
    setLoading(false);
  }, [employeeId]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${employeeId}`,
        },
        (payload) => {
          // Add new notification to top of list
          setNotifications((prev) => [payload.new as Notification, ...prev.slice(0, 9)]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${employeeId}`,
        },
        (payload) => {
          // Update notification in list
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
          );
          // Recalculate unread count
          setNotifications((prev) => {
            setUnreadCount(prev.filter((n) => !n.read_at).length);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Mark as read
  const markAsRead = async (notificationId: string) => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("id", notificationId)
      .is("read_at", null);

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);

    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as never)
      .in("id", unreadIds);

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  // Dismiss notification
  const dismiss = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ dismissed_at: new Date().toISOString() } as never)
      .eq("id", notificationId);

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (notifications.find((n) => n.id === notificationId && !n.read_at)) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Get entity link
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
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border rounded-xl shadow-lg overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => {
                const EntityIcon =
                  entityIcons[notification.entity_type as NotificationEntityType] || FileText;
                const link = getEntityLink(notification);

                return (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read_at && markAsRead(notification.id)}
                    className={cn(
                      "relative px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer",
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

                    <div className="flex gap-3 pl-2">
                      {/* Icon */}
                      <div className="shrink-0 mt-0.5">
                        <EntityIcon className="h-4 w-4 text-muted-foreground" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm truncate",
                              !notification.read_at && "font-medium"
                            )}
                          >
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => dismiss(notification.id, e)}
                            className="shrink-0 p-1 rounded hover:bg-muted -mr-1"
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>

                        {notification.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {notification.body}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.created_at)}
                          </span>

                          {link && (
                            <Link
                              href={link}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read_at && (
                        <div className="shrink-0">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-muted/30">
            <Link
              href="/admin/notifications"
              className="text-xs text-primary hover:underline block text-center"
              onClick={() => setIsOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for collapsed sidebar
export function NotificationBell({
  employeeId,
  className,
}: {
  employeeId: string;
  className?: string;
}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    // Initial fetch
    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", employeeId)
        .is("read_at", null)
        .is("dismissed_at", null);

      setUnreadCount(count || 0);
    };

    fetchCount();

    // Subscribe to changes
    const channel = supabase
      .channel(`notification-count:${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${employeeId}`,
        },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  return (
    <Link
      href="/admin/notifications"
      className={cn("relative p-2 rounded-lg hover:bg-muted transition-colors", className)}
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
