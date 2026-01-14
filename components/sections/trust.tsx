"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, FileCheck, Anchor, Award, Building2, ExternalLink } from "lucide-react";
import { BorderBeam } from "@/components/ui/magic/border-beam";

const credentials = [
  {
    icon: Shield,
    title: "USDOT",
    value: "#1234567",
    description: "Licensed & Registered",
    verifyUrl: "https://safer.fmcsa.dot.gov/",
  },
  {
    icon: FileCheck,
    title: "MC Number",
    value: "MC-123456",
    description: "Motor Carrier Authority",
    verifyUrl: "https://safer.fmcsa.dot.gov/",
  },
  {
    icon: Anchor,
    title: "SCAC Code",
    value: "NSLG",
    description: "Intermodal Certified",
    verifyUrl: null,
  },
  {
    icon: Award,
    title: "Insurance",
    value: "$1,000,000",
    description: "Cargo Coverage",
    verifyUrl: null,
  },
  {
    icon: Building2,
    title: "LA/LB Ports",
    value: "10+",
    description: "Terminals Served",
    verifyUrl: null,
  },
];

export function TrustSection() {
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
            Verify Our Credentials
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Licensed, insured, and fully compliant. No surprises.
          </p>
        </motion.div>

        {/* Credentials Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-4xl"
        >
          <div className="relative rounded-2xl border border-border bg-card p-8 overflow-hidden">
            <BorderBeam
              size={300}
              duration={12}
              colorFrom="oklch(0.45 0.16 245)"
              colorTo="oklch(0.62 0.19 38)"
            />

            <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
              {credentials.map((credential, index) => (
                <motion.div
                  key={credential.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-3">
                    <credential.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {credential.title}
                  </h3>
                  <p className="mt-1 text-lg font-bold text-primary font-mono">
                    {credential.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {credential.description}
                  </p>
                  {credential.verifyUrl && (
                    <Link
                      href={credential.verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Verify
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Request COI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            Need our Certificate of Insurance?
          </p>
          <Link
            href="/contact?subject=COI%20Request"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2 text-sm font-medium text-foreground hover:bg-secondary hover:border-primary/50 transition-all"
          >
            <FileCheck className="h-4 w-4" />
            Request COI
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
