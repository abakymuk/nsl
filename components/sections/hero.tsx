"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Phone, ArrowRight, CheckCircle2 } from "lucide-react";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";
import { WordRotate } from "@/components/ui/magic/animated-text";
import { NumberTicker } from "@/components/ui/magic/number-ticker";
import { Marquee } from "@/components/ui/magic/marquee";
import { BackgroundBeams } from "@/components/ui/aceternity/background-beams";

const terminals = [
  "APM Terminals",
  "Fenix Marine",
  "TraPac",
  "Yusen Terminals",
  "LBCT",
  "TTI",
  "Everport",
  "PCT",
  "WBCT",
  "LACT",
];

const stats = [
  { value: 1200, label: "Containers Moved", suffix: "+" },
  { value: 98, label: "On-Time Delivery", suffix: "%" },
  { value: 10, label: "Terminals Served", suffix: "" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Effects */}
      <BackgroundBeams className="opacity-40" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background pointer-events-none" />

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
            Container stuck at{" "}
            <span className="text-primary">
              <WordRotate
                words={["LBCT", "APM", "Fenix", "TraPac", "TTI"]}
                className="inline-block"
              />
            </span>
            ?
            <br />
            <span className="text-muted-foreground">We&apos;ll get it moving.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl max-w-2xl mx-auto"
          >
            LA/LB drayage without the guesswork. Clear pricing. Real tracking.
            A dispatcher who actually calls you back.
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
              shimmerColor="oklch(0.65 0.2 45)"
              background="oklch(0.45 0.15 240)"
            >
              <Link href="/quote" className="flex items-center gap-2">
                Get Quote in 2 Hours
                <ArrowRight className="h-4 w-4" />
              </Link>
            </ShimmerButton>

            <Link
              href="/track"
              className="h-12 px-8 inline-flex items-center justify-center rounded-full border border-border bg-card/50 backdrop-blur-sm text-base font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Track Container
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
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
                  <span className="hidden sm:block text-border ml-6">|</span>
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
