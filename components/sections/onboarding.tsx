"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FileText, UserCheck, MapPin, CheckCircle2, Zap } from "lucide-react";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";

const steps = [
  {
    step: 1,
    icon: FileText,
    title: "Request a Quote",
    description: "Fill out our simple form — takes 30 seconds",
    time: "30 sec",
  },
  {
    step: 2,
    icon: UserCheck,
    title: "Get Assigned Dispatcher",
    description: "A real person reviews and confirms your timeline",
    time: "2 hours",
  },
  {
    step: 3,
    icon: MapPin,
    title: "Track Your Container",
    description: "Monitor pickup, transit, and delivery in real-time",
    time: "Same day",
  },
];

export function OnboardingSection() {
  return (
    <section className="relative border-t bg-gradient-to-b from-primary/5 to-transparent">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 mb-6">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              Quick Start
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            First Load in 48 Hours
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No complicated onboarding. No long-term commitments. Try us on one
            load and see the difference.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="mx-auto max-w-4xl mb-16">
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Connector line (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-border" />
                )}

                <div className="relative rounded-xl border border-border bg-card p-6 text-center">
                  {/* Step number badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {step.description}
                  </p>

                  {/* Time badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">
                      {step.time}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mx-auto max-w-xl"
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-semibold text-foreground">
                No contract required.
              </span>{" "}
              Start with a single container and scale when you&apos;re ready.
            </p>
            <ShimmerButton
              className="h-11 px-6 text-sm"
              shimmerColor="oklch(0.62 0.19 38)"
              background="oklch(0.45 0.16 245)"
            >
              <Link href="/quote">Get Your First Quote</Link>
            </ShimmerButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
