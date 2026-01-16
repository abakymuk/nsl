"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Phone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PhoneBanner() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastScrollYRef = useRef(0);

  // Check if on admin pages
  const isAdminPage = pathname?.startsWith("/admin");

  useEffect(() => {
    // Don't set up scroll listener on admin pages
    if (isAdminPage) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;

      // Show banner when scrolling up and past 200px, hide when scrolling down
      if (currentScrollY < lastScrollY && currentScrollY > 200) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      }

      // Hide at very top of page
      if (currentScrollY < 100) {
        setIsVisible(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAdminPage]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  // Don't show if dismissed, on desktop, or on admin pages
  if (isDismissed || isAdminPage) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        >
          <div className="bg-primary text-primary-foreground shadow-lg">
            <div className="flex items-center justify-between px-4 py-3">
              <a
                href="tel:+13109999999"
                className="flex items-center gap-3 flex-1"
                onClick={() => {
                  // Track click event for analytics
                  if (typeof window !== "undefined" && window.gtag) {
                    window.gtag("event", "click_to_call", {
                      event_category: "engagement",
                      event_label: "phone_banner",
                    });
                  }
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Call for Quick Quote</p>
                  <p className="text-lg font-bold">(310) 999-9999</p>
                </div>
              </a>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Safe area padding for notched phones */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Add type declaration for gtag
declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params?: Record<string, string>
    ) => void;
  }
}
