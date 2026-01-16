"use client";

import { motion } from "framer-motion";
import { FileText, UserCheck, MapPin, Package, Bell } from "lucide-react";
import { SimpleTimeline } from "@/components/ui/aceternity/timeline";

const steps = [
  {
    step: 1,
    title: "You request a quote",
    description:
      "Fill out our simple form with container details, terminal, and delivery location. Takes 30 seconds.",
    icon: FileText,
  },
  {
    step: 2,
    title: "You get assigned a dispatcher",
    description:
      "A real dispatcher reviews your request and responds within 15 minutes. They become your single point of contact throughout.",
    icon: UserCheck,
  },
  {
    step: 3,
    title: "You track with real updates",
    description:
      "Monitor your container in real-time. We send updates at pickup, delivery, and any changes — no need to call or email.",
    icon: MapPin,
  },
  {
    step: 4,
    title: "You receive delivery + documents",
    description:
      "Container delivered on time, with all necessary documents provided promptly. No surprises.",
    icon: Package,
  },
];

export function ProcessSection() {
  return (
    <section className="relative border-t">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Simple. Transparent. No magic — just good operations.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="mx-auto max-w-3xl">
          <SimpleTimeline items={steps} />
        </div>

        {/* Communication Promise */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 mx-auto max-w-3xl"
        >
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  Our Communication Promise
                </h3>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">One dispatcher, start to finish.</span>{" "}
                  Updates at pickup, at delivery, and immediately if anything changes.
                  No chasing. No wondering. No surprises.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-8 mx-auto max-w-2xl"
        >
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                Better an honest quote in 1–2 hours
              </span>{" "}
              than a fake instant quote in 30 seconds.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
