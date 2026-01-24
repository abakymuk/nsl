"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { show, showNewMessage, onUnreadCountChange } from "@intercom/messenger-js-sdk";
import { cn } from "@/lib/utils";

interface ChatLauncherProps {
  className?: string;
}

/**
 * Custom Intercom chat launcher
 *
 * Features:
 * - Positioned above PhoneBanner on mobile (bottom-20)
 * - Standard position on desktop (bottom-6)
 * - Shows unread count badge
 * - Hidden on admin pages
 * - Graceful handling when Intercom not loaded
 */
export function ChatLauncher({ className }: ChatLauncherProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Check if Intercom is available
  useEffect(() => {
    if (!mounted) return;

    // Give Intercom time to initialize
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && window.Intercom) {
        setIsReady(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [mounted]);

  // Listen for unread count changes
  useEffect(() => {
    if (!isReady) return;

    try {
      onUnreadCountChange((count: number) => {
        setUnreadCount(count);
      });
    } catch {
      // Intercom not ready
    }
  }, [isReady]);

  // Handle click - open new message composer
  const handleClick = useCallback(() => {
    try {
      // If there are unread messages, show inbox; otherwise start new conversation
      if (unreadCount > 0) {
        show();
      } else {
        showNewMessage("Hi! I have a question about drayage services.");
      }
    } catch {
      // Fallback: open contact page if Intercom fails
      window.location.href = "/contact";
    }
  }, [unreadCount]);

  // Hide on admin pages or before mounting (prevents hydration mismatch)
  if (!mounted || pathname?.startsWith("/admin")) {
    return null;
  }

  // Don't render until Intercom is ready
  if (!isReady) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Open chat"
      className={cn(
        "fixed z-40 flex items-center justify-center",
        "w-14 h-14 rounded-full shadow-lg",
        "bg-primary text-primary-foreground",
        "hover:scale-105 active:scale-95 transition-transform duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        // Position: above PhoneBanner on mobile, standard on desktop
        "right-4 bottom-20 lg:bottom-6 lg:right-6",
        className
      )}
    >
      <MessageCircle className="w-6 h-6" />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-1 -right-1",
            "min-w-5 h-5 px-1.5",
            "bg-red-500 rounded-full",
            "text-white text-xs font-medium",
            "flex items-center justify-center",
            "animate-pulse"
          )}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
