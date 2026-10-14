"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { safePage, track } from "@/lib/analytics";

export function WebsiteAnalytics() {
  const pathname = usePathname();
  const lastPage = useRef<string | null>(null);
  useEffect(() => {
    if (lastPage.current === pathname) return;
    lastPage.current = pathname;
    track("NSL: Page Viewed", { page: pathname });
    if (pathname === "/quote") track("NSL: Quote Form Viewed");
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";
      const placement = link.closest("nav") ? "navigation" : link.closest("footer") ? "footer" : link.closest("main") ? "content" : "floating";
      if (href.startsWith("tel:") || href.startsWith("mailto:")) {
        track("NSL: Contact Clicked", { channel: href.startsWith("tel:") ? "phone" : "email", placement });
      } else {
        try {
          const url = new URL(href, window.location.origin);
          if (url.origin === window.location.origin && safePage(url.pathname) === "/quote") {
            track("NSL: Quote CTA Clicked", { placement });
          }
        } catch { /* Ignore malformed links. */ }
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
