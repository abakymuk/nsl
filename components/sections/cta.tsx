"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";
import { BackgroundGradient } from "@/components/ui/aceternity/background-beams";
import { CONTACT } from "@/lib/contact";

export function CTASection() {
  return (
    <section className="relative border-t bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <BackgroundGradient className="rounded-3xl p-8 md:p-12 bg-card">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Ready to Get Started?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Get a quote from a real dispatcher. No bots, no fake instant pricing.
                Just honest numbers in 15 min.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <ShimmerButton
                  className="h-12 px-8 text-base w-full sm:w-auto"
                  shimmerColor="oklch(0.62 0.19 38)"
                  background="oklch(0.45 0.16 245)"
                >
                  <Link href="/quote" className="flex items-center gap-2">
                    Request a Quote
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </ShimmerButton>

                <Link
                  href="/contact"
                  className="h-12 px-8 w-full sm:w-auto inline-flex items-center justify-center rounded-full border border-border bg-card text-base font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Contact Us
                </Link>
              </div>

              {/* Contact Info */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
                <Link
                  href={`tel:${CONTACT.PHONE_TEL}`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  {CONTACT.PHONE_TOLL_FREE}
                </Link>
                <span className="hidden sm:block text-border">|</span>
                <Link
                  href={`mailto:${CONTACT.EMAIL_INFO}`}
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {CONTACT.EMAIL_INFO}
                </Link>
              </div>
            </div>
          </BackgroundGradient>
        </motion.div>
      </div>
    </section>
  );
}
