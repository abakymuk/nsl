"use client";

import { motion } from "framer-motion";
import { FileText, Clock, MapPin, Package } from "lucide-react";
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
    title: "We confirm feasibility & timeline",
    description:
      "A real dispatcher reviews your request and responds within 1–2 business hours with a confirmed quote and timeline.",
    icon: Clock,
  },
  {
    step: 3,
    title: "You track the container",
    description:
      "Monitor your container's status in real-time without calling or emailing. We keep you updated.",
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

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 mx-auto max-w-2xl"
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
