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

// Hero background configuration
// Set to true to enable the hero background image
const HAS_HERO_IMAGE = true;

// Overlay opacity: adjust this value (0.5 - 0.75) to control text readability
// Higher = darker overlay = more readable text, less visible image
const OVERLAY_OPACITY = 0.65; // Desktop overlay strength
const OVERLAY_OPACITY_MOBILE = 0.75; // Mobile overlay strength (busier on small screens)

export function HeroSection() {
  const [imageError, setImageError] = useState(false);
  const showImage = HAS_HERO_IMAGE && !imageError;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background - Image or Gradient Fallback */}
      <div className="absolute inset-0 -z-10">
        {/* Fallback background color in case image fails */}
        <div className="absolute inset-0 bg-background" />

        {showImage ? (
          <>
            {/* Background Image with subtle treatment for premium feel */}
            <Image
              src="/images/hero/hero-bg.jpg"
              alt=""
              fill
              className="object-cover saturate-[0.85] pointer-events-none"
              priority
              sizes="100vw"
              onError={() => setImageError(true)}
            />
            {/* Dark overlay - Desktop: OVERLAY_OPACITY, Mobile: OVERLAY_OPACITY_MOBILE */}
            {/* Adjust opacity values at top of file to control readability vs image visibility */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to bottom,
                  rgba(0,0,0,${OVERLAY_OPACITY_MOBILE}) 0%,
                  rgba(0,0,0,${OVERLAY_OPACITY_MOBILE * 0.9}) 50%,
                  rgba(0,0,0,${OVERLAY_OPACITY_MOBILE * 0.95}) 100%)`
              }}
            />
            {/* Desktop-specific lighter overlay (hidden on mobile) */}
            <div
              className="absolute inset-0 pointer-events-none hidden sm:block"
              style={{
                background: `linear-gradient(to bottom,
                  rgba(0,0,0,${OVERLAY_OPACITY - OVERLAY_OPACITY_MOBILE}) 0%,
                  rgba(0,0,0,${(OVERLAY_OPACITY * 0.9) - (OVERLAY_OPACITY_MOBILE * 0.9)}) 50%,
                  rgba(0,0,0,${(OVERLAY_OPACITY * 0.95) - (OVERLAY_OPACITY_MOBILE * 0.95)}) 100%)`
              }}
            />
            {/* Subtle top gradient for nav readability */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        )}
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
              href="tel:+18885330302"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:border-white/40 hover:bg-white/15 transition-all"
            >
              <Phone className="h-4 w-4 text-primary" />
              <span>Call (888) 533-0302</span>
              <span className="text-white/40">·</span>
              <span>Mon-Fri 7AM-5PM PST</span>
            </Link>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-lg"
          >
            LA/LB Drayage with{" "}
            <span className="text-primary">Secure Private Yard</span>
          </motion.h1>

          {/* Specs Line */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-2 text-white/80"
          >
            <span className="flex items-center gap-1.5">
              <Warehouse className="h-4 w-4 text-primary" />
              50+ container capacity
            </span>
            <span className="hidden sm:inline text-white/50">•</span>
            <span>24/7 security</span>
            <span className="hidden sm:inline text-white/50">•</span>
            <span>12+ terminals</span>
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg leading-8 text-white/75 sm:text-xl max-w-2xl mx-auto"
          >
            Avoid demurrage with our private secured yard. Real quotes in 15 min
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
                Get Quote in 15 min
                <ArrowRight className="h-4 w-4" />
              </Link>
            </ShimmerButton>

{/* Yard button hidden until photos ready */}
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
                <span className="text-2xl font-bold text-white">
                  <NumberTicker value={stat.value} />
                  {stat.suffix}
                </span>
                <span className="text-sm text-white/70">{stat.label}</span>
                {index < stats.length - 1 && (
                  <span className="hidden sm:block text-white/30 ml-4">|</span>
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
          <p className="text-center text-sm text-white/60 mb-6">
            Serving all major LA/LB terminals
          </p>
          <Marquee pauseOnHover className="[--duration:30s]">
            {terminals.map((terminal) => (
              <div
                key={terminal}
                className="mx-4 flex items-center justify-center rounded-lg border border-white/15 bg-white/10 backdrop-blur-sm px-6 py-3 text-sm font-medium text-white/70 hover:text-white hover:border-white/30 hover:bg-white/15 transition-all"
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
