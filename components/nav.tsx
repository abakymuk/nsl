"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { FloatingNav } from "@/components/ui/aceternity/floating-navbar";
import { FloatingDock } from "@/components/ui/aceternity/floating-dock";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Package,
  Settings,
  Shield,
  Users,
  Mail,
  Home,
  MapPin,
  Phone,
  FileText,
  LogIn,
  LayoutDashboard,
} from "lucide-react";

const navItems = [
  { name: "Services", link: "/services", icon: <Package className="h-4 w-4" /> },
  { name: "Process", link: "/process", icon: <Settings className="h-4 w-4" /> },
  { name: "Compliance", link: "/compliance", icon: <Shield className="h-4 w-4" /> },
  { name: "About", link: "/about", icon: <Users className="h-4 w-4" /> },
  { name: "Contact", link: "/contact", icon: <Mail className="h-4 w-4" /> },
];

const dockItems = [
  { title: "Home", icon: <Home className="h-full w-full" />, href: "/" },
  { title: "Quote", icon: <FileText className="h-full w-full" />, href: "/quote" },
  { title: "Track", icon: <MapPin className="h-full w-full" />, href: "/track" },
  { title: "Call", icon: <Phone className="h-full w-full" />, href: "tel:+13105551234" },
  { title: "Contact", icon: <Mail className="h-full w-full" />, href: "/contact" },
];

export function Nav() {
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
              href="tel:+13105551234"
              className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span>(310) 555-1234</span>
            </Link>
            <Link
              href="/track"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Track
            </Link>
            <ThemeToggle />

            {/* Auth buttons */}
            <SignedOut>
              <Link
                href="/sign-in"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "h-8 w-8",
                  },
                }}
              />
            </SignedIn>

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
