"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Phone, ArrowRight, CheckCircle2, Warehouse } from "lucide-react";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";
import { NumberTicker } from "@/components/ui/magic/number-ticker";
import { Marquee } from "@/components/ui/magic/marquee";

const terminals = [
  "YTI",
  "PCT",
  "Pier A",
  "FMS",
  "LBCT",
  "WBCT",
  "TraPac",
  "Everport",
  "TTI",
  "Shippers Transport",
  "APM",
  "ITS",
];

const stats = [
  { value: 50, label: "Yard Capacity", suffix: "+" },
  { value: 98, label: "On-Time Rate", suffix: "%" },
  { value: 12, label: "Terminals", suffix: "" },
  { value: 15, label: "Min Quotes", suffix: "" },
];

// Set to true once you have real yard photos
const HAS_HERO_IMAGE = false;

export function HeroSection() {
  const [imageError, setImageError] = useState(false);
  const showImage = HAS_HERO_IMAGE && !imageError;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background - Image or Gradient Fallback */}
      <div className="absolute inset-0 -z-10">
        {showImage ? (
          <Image
            src="/images/yard/hero-yard.jpg"
            alt="New Stream Logistics secured container yard"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Phone Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="tel:+13105551234"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur-sm px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
            >
              <Phone className="h-4 w-4 text-primary" />
              <span>Call (310) 555-1234</span>
              <span className="text-muted-foreground/50">·</span>
              <span>Mon-Fri 6AM-6PM PST</span>
            </Link>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
          >
            LA/LB Drayage with{" "}
            <span className="text-primary">Secure Private Yard</span>
          </motion.h1>

          {/* Specs Line */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-2 text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-primary" />
              50+ container capacity
            </span>
            <span className="hidden sm:inline">•</span>
            <span>24/7 security</span>
            <span className="hidden sm:inline">•</span>
            <span>All 10 terminals</span>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto"
          >
            Avoid demurrage with our private secured yard. Real quotes in 2 hours
            from real dispatchers — no bots, no fake pricing.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <ShimmerButton
              className="h-12 px-8 text-base"
              shimmerColor="oklch(0.62 0.19 38)"
              background="oklch(0.45 0.16 245)"
            >
              <Link href="/quote" className="flex items-center gap-2">
                Get Quote in 2 Hours
                <ArrowRight className="h-4 w-4" />
              </Link>
            </ShimmerButton>

            <Link
              href="#yard"
              className="h-12 px-8 inline-flex items-center justify-center rounded-full border border-border bg-card/50 backdrop-blur-sm text-base font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Warehouse className="h-4 w-4 mr-2" />
              See Our Yard
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-8"
          >
            {stats.map((stat, index) => (
              <div key={stat.label} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  <NumberTicker value={stat.value} />
                  {stat.suffix}
                </span>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                {index < stats.length - 1 && (
                  <span className="hidden sm:block text-border ml-4">|</span>
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Terminal Marquee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-20"
        >
          <p className="text-center text-sm text-muted-foreground mb-6">
            Serving all major LA/LB terminals
          </p>
          <Marquee pauseOnHover className="[--duration:30s]">
            {terminals.map((terminal) => (
              <div
                key={terminal}
                className="mx-4 flex items-center justify-center rounded-lg border border-border bg-card/50 backdrop-blur-sm px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
              >
                {terminal}
              </div>
            ))}
          </Marquee>
        </motion.div>
      </div>
    </section>
  );
}
