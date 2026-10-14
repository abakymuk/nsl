"use client";
import Image from "next/image";
import Link from "next/link";
import { FloatingNav } from "@/components/ui/aceternity/floating-navbar";
import { FloatingDock } from "@/components/ui/aceternity/floating-dock";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";
import { Package, Settings, Shield, Mail, Home, FileText } from "lucide-react";

const navItems = [
  { name: "Services", link: "/services", icon: <Package className="h-4 w-4" /> },
  { name: "Process", link: "/process", icon: <Settings className="h-4 w-4" /> },
  { name: "Compliance", link: "/compliance", icon: <Shield className="h-4 w-4" /> },
  { name: "Contact", link: "/contact", icon: <Mail className="h-4 w-4" /> },
];

const dockItems = [
  { title: "Home", icon: <Home className="h-full w-full" />, href: "/" },
  { title: "Quote", icon: <FileText className="h-full w-full" />, href: "/quote" },
  { title: "Contact", icon: <Mail className="h-full w-full" />, href: "/contact" },
];

export function Nav() {
  return <>
    <FloatingNav navItems={navItems} logo={
      <Link href="/" className="flex items-center gap-2">
        <Image src="/images/logo/newstream-logo.svg" alt="New Stream Logistics" width={36} height={36} className="h-9 w-9" />
        <span className="font-semibold text-foreground hidden sm:inline-block">New Stream Logistics</span>
      </Link>
    } ctaButton={
      <ShimmerButton className="h-9 text-sm" shimmerColor="oklch(0.62 0.19 38)" background="oklch(0.45 0.16 245)">
        <Link href="/quote">Get Quote</Link>
      </ShimmerButton>
    } />
    <FloatingDock items={dockItems} />
    <div className="h-16" />
  </>;
}
