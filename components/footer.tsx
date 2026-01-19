"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, Mail, MapPin, ArrowUpRight } from "lucide-react";

const navigation = {
  main: [
    { name: "Services", href: "/services" },
    { name: "Process", href: "/process" },
    { name: "Compliance", href: "/compliance" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Compliance & Safety", href: "/compliance" },
    { name: "Request COI", href: "/contact?subject=COI%20Request" },
  ],
};

export function Footer() {
  const pathname = usePathname();

  // Don't render footer on admin pages (admin has its own layout)
  if (pathname?.startsWith("/admin")) {
    return null;
  }
  return (
    <footer className="border-t bg-secondary/30 pb-24 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/logo/newstream-logo.svg"
                alt="New Stream Logistics"
                width={40}
                height={40}
                className="h-10 w-10"
              />
              <span className="font-semibold text-lg text-foreground">
                New Stream Logistics
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Reliable LA/LB drayage services without the guesswork.
              Clear pricing, real tracking, and dispatchers who call you back.
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <Link
                href="tel:+13105551234"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4 text-primary" />
                (310) 555-1234
              </Link>
              <Link
                href="mailto:info@newstreamlogistics.com"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4 text-primary" />
                info@newstreamlogistics.com
              </Link>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <span>18501 South Main Street<br />Gardena, CA 90248</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">Navigation</h3>
            <ul className="mt-4 space-y-3">
              {navigation.main.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Compliance */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">Compliance</h3>
            <ul className="mt-4 space-y-3">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Credentials */}
            <div className="mt-6 space-y-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">USDOT</span> #4403165
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">MC</span> #1728721
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">SCAC</span> NSLG
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-semibold text-foreground">Get Started</h3>
            <div className="mt-4 space-y-3">
              <Link
                href="/quote"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-card/80 transition-all group"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Request a Quote</p>
                  <p className="text-xs text-muted-foreground">Get pricing in 15 min</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href="/track"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-card/80 transition-all group"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Track Container</p>
                  <p className="text-xs text-muted-foreground">Check your load status</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </div>

            {/* Hours */}
            <div className="mt-6 rounded-xl bg-primary/5 border border-primary/10 p-4">
              <p className="text-xs font-medium text-foreground mb-2">Business Hours</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Mon - Fri: 6:00 AM - 6:00 PM PST</p>
                <p>Saturday: 8:00 AM - 2:00 PM PST</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} New Stream Logistics. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground text-center sm:text-right">
              Compliance is not a checkbox — it&apos;s part of our operations.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
