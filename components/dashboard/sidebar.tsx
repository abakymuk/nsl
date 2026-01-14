"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Truck,
  User,
  Settings,
  Users,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Quotes",
    href: "/dashboard/quotes",
    icon: FileText,
  },
  {
    title: "Loads",
    href: "/dashboard/loads",
    icon: Truck,
  },
  {
    title: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    title: "Team",
    href: "/dashboard/settings/team",
    icon: Users,
    adminOnly: true,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    adminOnly: true,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const res = await fetch("/api/auth/permissions");
        const data = await res.json();
        setIsOrgAdmin(data.orgRole === "admin");
      } catch {
        // Ignore errors
      }
    };
    checkPermissions();
  }, []);

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isOrgAdmin
  );

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:border-r bg-card">
      <nav className="flex-1 px-4 py-6 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm font-medium">Need help?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Contact our support team
          </p>
          <Link
            href="/contact"
            className="mt-3 text-xs text-primary hover:underline inline-block"
          >
            Get Support
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function MobileDashboardNav() {
  const pathname = usePathname();
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const res = await fetch("/api/auth/permissions");
        const data = await res.json();
        setIsOrgAdmin(data.orgRole === "admin");
      } catch {
        // Ignore errors
      }
    };
    checkPermissions();
  }, []);

  // For mobile, show limited items (exclude Team, keep Settings for admins)
  const mobileItems = navItems.filter(
    (item) =>
      (!item.adminOnly || (item.adminOnly && isOrgAdmin)) &&
      item.href !== "/dashboard/settings/team"
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t px-4 py-2">
      <div className="flex justify-around items-center">
        {mobileItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
