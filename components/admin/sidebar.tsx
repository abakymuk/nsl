"use client";

import { useState, useEffect, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
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
} from "lucide-react";

// Sidebar context for sharing collapsed state
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
  user: {
    email: string;
    name?: string;
  };
}

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Quotes",
    href: "/admin/quotes",
    icon: FileText,
  },
  {
    title: "Shipments",
    href: "/admin/shipments",
    icon: Truck,
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "PortPro Sync",
    href: "/admin/sync",
    icon: RefreshCw,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function SidebarProvider({ children, user }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-collapsed");
    if (stored) {
      setCollapsed(JSON.parse(stored));
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  // Close mobile menu on route change
  const pathname = usePathname();
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="min-h-screen bg-muted/30">
        {/* Desktop Sidebar */}
        <DesktopSidebar user={user} />

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <MobileSidebar user={user} />

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
          <main className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

function DesktopSidebar({ user }: { user: { email: string; name?: string } }) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebar();

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
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">NS</span>
          </div>
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
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
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

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-colors",
                collapsed
                  ? "justify-center h-10 w-full"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-5 w-5")} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn(
        "border-t py-4",
        collapsed ? "px-2" : "px-3"
      )}>
        {/* Theme Toggle */}
        <div className={cn(
          "flex items-center mb-2",
          collapsed ? "justify-center" : "px-3"
        )}>
          <ThemeToggle />
          {!collapsed && (
            <span className="ml-3 text-sm text-muted-foreground">Theme</span>
          )}
        </div>

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

function MobileSidebar({ user }: { user: { email: string; name?: string } }) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();

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
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">NS</span>
          </div>
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
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
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
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-3 py-4 space-y-1">
        <div className="flex items-center px-3 py-2">
          <ThemeToggle />
          <span className="ml-3 text-sm text-muted-foreground">Theme</span>
        </div>

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
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xs">NS</span>
        </div>
        <span className="font-semibold text-sm">New Stream</span>
      </Link>

      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
        <span className="text-primary-foreground font-medium text-xs">
          {initials}
        </span>
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
