"use client";

import { useRef } from "react";
import { PriceEstimator } from "@/components/quote/price-estimator";
import QuoteForm from "./quote-form";
import { Star } from "lucide-react";
import { featuredTestimonial } from "@/lib/data/testimonials";

export default function QuotePageClient() {
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Sidebar with Price Estimator - Desktop */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            <PriceEstimator onGetFullQuote={scrollToForm} />

            {/* Mini Testimonial */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic mb-3">
                &ldquo;{featuredTestimonial.quote}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {featuredTestimonial.author.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium">{featuredTestimonial.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {featuredTestimonial.company}
                  </p>
                </div>
              </div>
            </div>
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
  );
}
