"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { FloatingNav } from "@/components/ui/aceternity/floating-navbar";
import { FloatingDock } from "@/components/ui/aceternity/floating-dock";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Settings,
  Shield,
  Mail,
  Home,
  MapPin,
  FileText,
  LogIn,
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";
import { isAdminEmail } from "@/lib/constants";

const navItems = [
  { name: "Services", link: "/services", icon: <Package className="h-4 w-4" /> },
  { name: "Process", link: "/process", icon: <Settings className="h-4 w-4" /> },
  { name: "Compliance", link: "/compliance", icon: <Shield className="h-4 w-4" /> },
  { name: "Contact", link: "/contact", icon: <Mail className="h-4 w-4" /> },
];

const dockItems = [
  { title: "Home", icon: <Home className="h-full w-full" />, href: "/" },
  { title: "Quote", icon: <FileText className="h-full w-full" />, href: "/quote" },
  { title: "Track", icon: <MapPin className="h-full w-full" />, href: "/track" },
  { title: "Contact", icon: <Mail className="h-full w-full" />, href: "/contact" },
];

export function Nav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if current user is admin
  const isAdmin = isAdminEmail(user?.email);

  // Determine the appropriate portal link based on role
  const portalLink = isAdmin ? "/admin" : "/dashboard";
  const portalLabel = isAdmin ? "Admin Panel" : "Dashboard";

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <FloatingNav
        navItems={navItems}
        logo={
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">NS</span>
            </div>
            <span className="font-semibold text-foreground hidden sm:inline-block">
              New Stream Logistics
            </span>
          </Link>
        }
        ctaButton={
          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Track
            </Link>
            <ThemeToggle />

            {/* Auth buttons */}
            {!loading && !user && (
              <Link
                href="/sign-in"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            )}

            {!loading && user && (
              <>
                <Link
                  href={portalLink}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isAdmin ? (
                    <ShieldCheck className="h-4 w-4" />
                  ) : (
                    <LayoutDashboard className="h-4 w-4" />
                  )}
                  <span>{portalLabel}</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        isAdmin
                          ? "bg-gradient-to-br from-primary to-accent"
                          : "bg-primary"
                      }`}>
                        <span className="text-primary-foreground font-medium text-xs">
                          {user.email?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user.email}</p>
                      {isAdmin && (
                        <p className="text-xs text-primary font-medium flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="h-3 w-3" />
                          Administrator
                        </p>
                      )}
                    </div>
                    <DropdownMenuSeparator />

                    {/* Show appropriate portal link */}
                    <DropdownMenuItem asChild>
                      <Link href={portalLink} className="cursor-pointer">
                        {isAdmin ? (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        ) : (
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                        )}
                        {portalLabel}
                      </Link>
                    </DropdownMenuItem>

                    {/* Admin users can also access customer dashboard */}
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard" className="cursor-pointer">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Customer View
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="cursor-pointer">
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            <ShimmerButton
              className="h-9 text-sm"
              shimmerColor="oklch(0.65 0.2 45)"
              background="oklch(0.45 0.15 240)"
            >
              <Link href="/quote">Get Quote</Link>
            </ShimmerButton>
          </div>
        }
      />

      {/* Mobile Floating Dock */}
      <FloatingDock items={dockItems} />

      {/* Spacer for fixed nav */}
      <div className="h-16" />
    </>
  );
}
