"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Package, Warehouse, Truck, AlertCircle, ArrowRight } from "lucide-react";
import { CardContainer, CardBody, CardItem } from "@/components/ui/aceternity/3d-card";
import { SpotlightCard } from "@/components/ui/aceternity/spotlight";

const services = [
  {
    icon: Package,
    title: "Import Drayage",
    description: "Reliable container transport from LA/LB ports to your destination.",
    features: ["Same-day pickup available", "Real-time tracking", "Flexible scheduling"],
    href: "/services#import-drayage",
  },
  {
    icon: Warehouse,
    title: "Pre-Pull & Storage",
    description: "Avoid demurrage with secure yard storage and pre-pull services.",
    features: ["Avoid demurrage fees", "Secured yard facility", "Flexible delivery windows"],
    href: "/services#pre-pull-storage",
  },
  {
    icon: Truck,
    title: "Local Delivery",
    description: "Timely final-mile delivery with full transparency throughout.",
    features: ["Direct communication", "Delivery confirmation", "Documentation included"],
    href: "/services#local-delivery",
  },
  {
    icon: AlertCircle,
    title: "Problem Containers",
    description: "Specialized handling for holds, tight LFDs, and urgent situations.",
    features: ["Customs hold resolution", "Expedited handling", "24/7 urgent response"],
    href: "/services#problem-containers",
  },
];

export function ServicesSection() {
  return (
    <section className="relative border-t bg-secondary/30">
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
            What We Actually Do
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            We focus on what breaks most often in drayage — and fix it.
          </p>
        </motion.div>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <CardContainer containerClassName="py-0">
                <CardBody className="relative h-auto w-full">
                  <SpotlightCard className="h-full p-6">
                    <CardItem translateZ={50}>
                      <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                        <service.icon className="h-6 w-6 text-primary" />
                      </div>
                    </CardItem>

                    <CardItem translateZ={40}>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        {service.title}
                      </h3>
                    </CardItem>

                    <CardItem translateZ={30}>
                      <p className="text-sm text-muted-foreground mb-4">
                        {service.description}
                      </p>
                    </CardItem>

                    <CardItem translateZ={20} className="w-full">
                      <ul className="space-y-2 mb-6">
                        {service.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardItem>

                    <CardItem translateZ={10} className="w-full">
                      <Link
                        href={service.href}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Learn more
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </CardItem>
                  </SpotlightCard>
                </CardBody>
              </CardContainer>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
