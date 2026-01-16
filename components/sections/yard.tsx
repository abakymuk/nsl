"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Warehouse,
  ShieldCheck,
  MapPin,
  Clock,
  Container,
  CalendarClock,
  Truck,
  ImageIcon,
} from "lucide-react";
import { PhotoGallery, type GalleryImage } from "@/components/ui/photo-gallery";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";

// Real yard photos available
const HAS_YARD_PHOTOS = true;

const yardImages: GalleryImage[] = [
  {
    src: "/images/yard/wolfgang-weiser-2j91qI-t2Wg-unsplash.jpg",
    alt: "Container yard with stacked shipping containers",
    caption: "Organized container staging area",
  },
  {
    src: "/images/yard/solomen-EoS4ZFRJCJ4-unsplash.jpg",
    alt: "Container storage at our LA/LB yard",
    caption: "50+ container capacity secured yard",
  },
  {
    src: "/images/yard/daphne-fecheyr-0-r7LSNq1b8-unsplash.jpg",
    alt: "Professional yard operations",
    caption: "Fully fenced with 24/7 monitoring",
  },
];

const specs = [
  {
    icon: Container,
    label: "Capacity",
    value: "50+ containers",
  },
  {
    icon: ShieldCheck,
    label: "Security",
    value: "24/7 monitored, fenced",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "LA/LB area",
  },
  {
    icon: Clock,
    label: "Access",
    value: "Flexible hours",
  },
];

const useCases = [
  {
    icon: CalendarClock,
    title: "Avoid Demurrage",
    description: "Pre-pull containers before LFD to eliminate per diem charges",
  },
  {
    icon: Truck,
    title: "Just-in-Time Delivery",
    description: "Stage containers and deliver exactly when your facility is ready",
  },
  {
    icon: Warehouse,
    title: "Secure Storage",
    description: "Hold freight during customs delays or receiver scheduling issues",
  },
];

export function YardSection() {
  return (
    <section id="yard" className="relative border-t">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 mb-6">
            <Warehouse className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Private Secured Yard
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Your Buffer Against Port Chaos
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            When terminals are backed up or LFD is tight, our private yard keeps
            your freight moving. No demurrage surprises. No delivery pressure.
          </p>
        </motion.div>

        {/* Photo Gallery or Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          {HAS_YARD_PHOTOS ? (
            <PhotoGallery images={yardImages} columns={3} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-[4/3] rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground"
                >
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-xs">Photo {i}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Specs Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-16"
        >
          {specs.map((spec, index) => (
            <motion.div
              key={spec.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-card p-4 text-center"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <spec.icon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {spec.label}
              </p>
              <p className="text-sm text-muted-foreground">{spec.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Use Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="text-xl font-semibold text-foreground text-center mb-8">
            How Our Yard Works for You
          </h3>
          <div className="grid gap-6 md:grid-cols-3">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <useCase.icon className="h-5 w-5 text-accent" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">
                  {useCase.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {useCase.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <ShimmerButton
              className="h-12 px-8 text-base"
              shimmerColor="oklch(0.62 0.19 38)"
              background="oklch(0.45 0.16 245)"
            >
              <Link href="/quote">Get a Quote</Link>
            </ShimmerButton>
            <Link
              href="/contact"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Questions? Contact us
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
