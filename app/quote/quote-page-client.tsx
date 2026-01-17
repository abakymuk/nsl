"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { PriceEstimator } from "@/components/quote/price-estimator";
import QuoteForm from "./quote-form";
import { Star, Shield, Clock, Truck } from "lucide-react";
import { featuredTestimonial } from "@/lib/data/testimonials";

export default function QuotePageClient() {
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-slate-50 dark:to-slate-950/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">
          {/* Sidebar - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Price Estimator */}
              <PriceEstimator onGetFullQuote={scrollToForm} />

              {/* Trust Indicators */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border bg-card p-5"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                  Why Choose Us
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">15 Min Response</p>
                      <p className="text-xs text-muted-foreground">
                        Real quotes from real people
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                      <Shield className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Fully Licensed</p>
                      <p className="text-xs text-muted-foreground">
                        USDOT & MC authority
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-500/10">
                      <Truck className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Port Specialists</p>
                      <p className="text-xs text-muted-foreground">
                        LA/LB port experts since 2015
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Testimonial */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl border bg-card p-5"
              >
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-accent text-accent"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic mb-4 leading-relaxed">
                  &ldquo;{featuredTestimonial.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {featuredTestimonial.author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {featuredTestimonial.author}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {featuredTestimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-2">
            {/* Mobile Price Estimator */}
            <div className="lg:hidden mb-8">
              <PriceEstimator onGetFullQuote={scrollToForm} />
            </div>

            {/* Form */}
            <div ref={formRef}>
              <QuoteForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
