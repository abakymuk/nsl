"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Marquee } from "@/components/ui/magic/marquee";

const testimonials = [
  {
    quote: "Finally, a drayage company that answers the phone and actually does what they say.",
    author: "James Chen",
    title: "Operations Manager",
    company: "Pacific Freight Solutions",
  },
  {
    quote: "They saved us from $2,000 in demurrage by pre-pulling before the LFD. Great communication.",
    author: "Maria Rodriguez",
    title: "Logistics Coordinator",
    company: "West Coast Imports",
  },
  {
    quote: "No BS. They told us upfront they couldn't make our timeline and suggested alternatives. Refreshing honesty.",
    author: "Robert Kim",
    title: "Supply Chain Director",
    company: "Golden State Trading",
  },
  {
    quote: "We've tried 5 drayage companies in LA. New Stream is the only one that consistently delivers on promises.",
    author: "Sarah Thompson",
    title: "Warehouse Manager",
    company: "Inland Distribution Co.",
  },
  {
    quote: "Their dispatcher remembered our delivery requirements from last month. That's rare in this industry.",
    author: "David Park",
    title: "Import Specialist",
    company: "Harbor Logistics Group",
  },
  {
    quote: "Container was on hold for customs. They worked with the terminal and got it released same day.",
    author: "Lisa Nakamura",
    title: "Operations Lead",
    company: "Transpacific Cargo",
  },
  {
    quote: "Instant updates at every stage, complete transparency on charges, no hidden costs. A reliable logistics partner.",
    author: "Goksu",
    title: "Operations Manager",
    company: "LEX Logistics Inc",
  },
];

const firstRow = testimonials.slice(0, testimonials.length / 2);
const secondRow = testimonials.slice(testimonials.length / 2);

function TestimonialCard({
  quote,
  author,
  title,
  company,
}: {
  quote: string;
  author: string;
  title: string;
  company: string;
}) {
  return (
    <div className="relative mx-4 w-80 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />

      {/* Stars */}
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-accent text-accent" />
        ))}
      </div>

      {/* Quote */}
      <p className="text-sm text-foreground leading-relaxed mb-4">
        &ldquo;{quote}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-primary">
            {author.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{author}</p>
          <p className="text-xs text-muted-foreground">{title}, {company}</p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="relative border-t overflow-hidden">
      <div className="py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center mb-16 px-4"
        >
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            What Freight Forwarders Say
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Real feedback from real customers. No fake reviews.
          </p>
        </motion.div>

        {/* Testimonials Marquee */}
        <div className="relative">
          {/* Gradient Masks */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-background to-transparent" />

          <Marquee pauseOnHover className="[--duration:50s] mb-4">
            {firstRow.map((testimonial) => (
              <TestimonialCard key={testimonial.author} {...testimonial} />
            ))}
          </Marquee>

          <Marquee pauseOnHover reverse className="[--duration:50s]">
            {secondRow.map((testimonial) => (
              <TestimonialCard key={testimonial.author} {...testimonial} />
            ))}
          </Marquee>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Trusted by <span className="font-semibold text-foreground">50+</span> freight forwarders in the LA/LB area
          </p>
        </motion.div>
      </div>
    </section>
  );
}
