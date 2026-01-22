"use client";

import { motion } from "framer-motion";
import { Warehouse, ShieldCheck, Ship, MapPin } from "lucide-react";

const trustItems = [
  {
    icon: Warehouse,
    label: "Private Yard",
    value: "50+ containers",
  },
  {
    icon: ShieldCheck,
    label: "24/7 Security",
    value: "Fully monitored",
  },
  {
    icon: Ship,
    label: "All Terminals",
    value: "12+ LA/LB terminals",
  },
  {
    icon: MapPin,
    label: "Real Updates",
    value: "Track in real-time",
  },
];

export function TrustBarSection() {
  return (
    <section className="border-t border-b border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12"
        >
          {trustItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
