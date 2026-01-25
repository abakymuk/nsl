"use client";

import { useState, useEffect, createContext, useContext, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Truck,
  Users,
  Settings,
  BarChart3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Building2,
  UserCog,
  UserPlus,
  Bell,
  type LucideIcon,
} from "lucide-react";
import type { AdminModule } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

// Sidebar context for sharing collapsed state and permissions
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  permissions: AdminModule[];
  isSuperAdmin: boolean;
  employeeId: string | null;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

export interface SidebarProviderProps {
  children: React.ReactNode;
  user: {
    email: string;
    name?: string;
  };
  permissions?: AdminModule[];
  isSuperAdmin?: boolean;
  employeeId?: string | null;
}

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  module: AdminModule;
}

// Map nav items to their corresponding modules
const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    module: "admin",
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
    module: "admin", // Available to all admin users
  },
  {
    title: "Quotes",
    href: "/admin/quotes",
    icon: FileText,
    module: "quotes",
  },
  {
    title: "Loads",
    href: "/admin/loads",
    icon: Truck,
    module: "loads",
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: Users,
    module: "customers",
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    module: "analytics",
  },
  {
    title: "PortPro Sync",
    href: "/admin/sync",
    icon: RefreshCw,
    module: "sync",
  },
  {
    title: "Employees",
    href: "/admin/employees",
    icon: UserPlus,
    module: "employees",
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: UserCog,
    module: "users",
  },
  {
    title: "Organizations",
    href: "/admin/organizations",
    icon: Building2,
    module: "organizations",
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    module: "settings",
  },
];

// Hook to fetch unread notification count
function useUnreadCount(employeeId: string | null, isSuperAdmin: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const canViewNotifications = Boolean(employeeId || isSuperAdmin);
    if (!canViewNotifications) return;

    const fetchCount = async () => {
      try {
        const response = await fetch("/api/notifications?unread_only=true&limit=1");
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };

    fetchCount();

    // Set up realtime subscription for new notifications
    const supabase = createClient();
    const channel = supabase
      .channel("notification-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchCount();
        }
      )
      .subscribe((_status, err) => {
        if (err) {
          // AbortError can happen when auth lock times out (multiple tabs, background tab, etc.)
          // This is a known Supabase behavior and not a critical error
          if (err.message?.includes("AbortError") || err.name === "AbortError") {
            console.debug("Notification subscription aborted (auth lock timeout)");
          } else {
            console.error("Notification subscription error:", err);
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId, isSuperAdmin]);

  return unreadCount;
}

export function SidebarProvider({
  children,
  user,
  permissions = [],
  isSuperAdmin = false,
  employeeId = null,
}: SidebarProviderProps) {
  // Initialize collapsed state from localStorage (lazy initial state)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("admin-sidebar-collapsed");
      return stored ? JSON.parse(stored) : false;
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter nav items based on permissions
  const filteredNavItems = useMemo(() => {
    return navItems.filter((item) => permissions.includes(item.module));
  }, [permissions]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  // Close mobile menu on route change (sync with external navigation)
  const pathname = usePathname();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        mobileOpen,
        setMobileOpen,
        permissions,
        isSuperAdmin,
        employeeId,
      }}
    >
      <div className="min-h-screen bg-muted/30">
        {/* Desktop Sidebar */}
        <DesktopSidebar user={user} navItems={filteredNavItems} />

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <MobileSidebar user={user} navItems={filteredNavItems} />

        {/* Main Content */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            collapsed ? "lg:pl-20" : "lg:pl-64"
          )}
        >
          {/* Mobile Header */}
          <MobileHeader user={user} />

          {/* Page Content */}
          <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

function DesktopSidebar({
  user,
  navItems,
}: {
  user: { email: string; name?: string };
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const { collapsed, setCollapsed, employeeId, isSuperAdmin } = useSidebar();
  const unreadCount = useUnreadCount(employeeId, isSuperAdmin);

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.charAt(0).toUpperCase();

  const displayName = user.name || user.email.split("@")[0];

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 border-r bg-card transition-all duration-300 ease-in-out",
        collapsed ? "lg:w-20" : "lg:w-64"
      )}
    >
      {/* Logo & Brand */}
      <div className={cn(
        "flex items-center border-b h-16",
        collapsed ? "justify-center px-2" : "px-4"
      )}>
        <Link href="/admin" className="flex items-center gap-3">
          <Image
            src="/images/logo/newstream-logo.svg"
            alt="New Stream Logistics"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0"
          />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">New Stream</p>
              <p className="text-xs text-muted-foreground">Logistics</p>
            </div>
          )}
        </Link>
      </div>

      {/* User Info */}
      <div className={cn(
        "border-b py-4",
        collapsed ? "px-2" : "px-4"
      )}>
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-medium text-sm">
              {initials}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-4 space-y-1 overflow-y-auto",
        collapsed ? "px-2" : "px-3"
      )}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          const isNotifications = item.href === "/admin/notifications";
          const showBadge = isNotifications && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors relative",
                collapsed
                  ? "justify-center h-10 w-full"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5 shrink-0" />
                {showBadge && collapsed && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {showBadge && (
                    <span className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-medium bg-primary text-primary-foreground rounded-full">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t py-4",
        collapsed ? "px-2" : "px-3"
      )}>
        {/* Sign Out */}
        <Link
          href="/sign-in"
          onClick={async (e) => {
            e.preventDefault();
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted",
            collapsed
              ? "justify-center h-10 w-full"
              : "gap-3 px-3 py-2.5"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </Link>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "mt-2 flex items-center rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted w-full",
            collapsed
              ? "justify-center h-10"
              : "gap-3 px-3 py-2.5"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function MobileSidebar({
  user,
  navItems,
}: {
  user: { email: string; name?: string };
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen, employeeId, isSuperAdmin } = useSidebar();
  const unreadCount = useUnreadCount(employeeId, isSuperAdmin);

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.charAt(0).toUpperCase();

  const displayName = user.name || user.email.split("@")[0];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r transform transition-transform duration-300 ease-in-out lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b">
        <Link href="/admin" className="flex items-center gap-3">
          <Image
            src="/images/logo/newstream-logo.svg"
            alt="New Stream Logistics"
            width={40}
            height={40}
            className="h-10 w-10"
          />
          <div>
            <p className="font-semibold text-sm">New Stream</p>
            <p className="text-xs text-muted-foreground">Logistics</p>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-primary-foreground font-medium text-sm">
              {initials}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          const isNotifications = item.href === "/admin/notifications";
          const showBadge = isNotifications && unreadCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.title}</span>
              {showBadge && (
                <span className="h-5 min-w-5 px-1.5 flex items-center justify-center text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-4 space-y-1">
        <Link
          href="/sign-in"
          onClick={async (e) => {
            e.preventDefault();
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}

function MobileHeader({ user }: { user: { email: string; name?: string } }) {
  const { setMobileOpen } = useSidebar();

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.charAt(0).toUpperCase();

  return (
    <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b bg-card">
      <button
        onClick={() => setMobileOpen(true)}
        className="p-2 rounded-lg hover:bg-muted transition-colors -ml-2"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link href="/admin" className="flex items-center gap-2">
        <Image
          src="/images/logo/newstream-logo.svg"
          alt="New Stream Logistics"
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="font-semibold text-sm">New Stream</span>
      </Link>

      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
          <span className="text-primary-foreground font-medium text-xs">
            {initials}
          </span>
        </div>
      </div>
    </header>
  );
}

// Legacy exports for backwards compatibility (no longer used but kept for safety)
export function AdminSidebar() {
  return null;
}

export function MobileAdminNav() {
  return null;
}
