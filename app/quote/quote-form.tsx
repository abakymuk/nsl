"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Package, MapPin, FileText, Loader2 } from "lucide-react";
import { ShimmerButton } from "@/components/ui/magic/shimmer-button";
import { BorderBeam } from "@/components/ui/magic/border-beam";
import type { QuoteFormData } from "@/types";
import { cn } from "@/lib/utils";

const terminals = [
  { value: "APM Terminals", short: "APM" },
  { value: "Fenix Marine Services", short: "Fenix" },
  { value: "TraPac", short: "TraPac" },
  { value: "Yusen Terminals", short: "Yusen" },
  { value: "Long Beach Container Terminal (LBCT)", short: "LBCT" },
  { value: "Total Terminals International (TTI)", short: "TTI" },
  { value: "Everport Terminal Services", short: "Everport" },
  { value: "Pacific Container Terminal", short: "PCT" },
  { value: "West Basin Container Terminal", short: "WBCT" },
  { value: "Los Angeles Container Terminal (LACT)", short: "LACT" },
];

const containerTypes = [
  { value: "20ft", label: "20ft Standard" },
  { value: "40ft", label: "40ft Standard" },
  { value: "40ft HC", label: "40ft High Cube" },
  { value: "45ft", label: "45ft High Cube" },
];

const steps = [
  { id: 1, name: "Container", icon: Package },
  { id: 2, name: "Delivery", icon: MapPin },
  { id: 3, name: "Details", icon: FileText },
];

export default function QuoteForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuoteFormData>({
    containerNumber: "",
    terminal: "",
    deliveryZip: "",
    containerType: "",
    lfd: "",
    notes: "",
  });

  const canProceedStep1 = formData.containerNumber.length >= 4 && formData.terminal;
  const canProceedStep2 = formData.deliveryZip.match(/^\d{5}(-\d{4})?$/) && formData.containerType;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit quote request");
      }

      router.push("/quote/thank-you");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Request a Quote
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Takes 30 seconds. Real quote in 1–2 hours.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300",
                      currentStep >= step.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium",
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-16 sm:w-24 mx-2 transition-all duration-300",
                      currentStep > step.id ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="relative rounded-2xl border border-border bg-card p-6 sm:p-8 overflow-hidden">
          <BorderBeam
            size={250}
            duration={10}
            colorFrom="oklch(0.45 0.15 240)"
            colorTo="oklch(0.65 0.2 45)"
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Container Details */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-1">Container Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter your container number and select the terminal.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="containerNumber" className="text-sm font-medium">
                    Container Number <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="containerNumber"
                    type="text"
                    value={formData.containerNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, containerNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="MSCU1234567"
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground font-mono text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    4-letter prefix + 7 digits (e.g., MSCU1234567)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Terminal <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {terminals.map((terminal) => (
                      <button
                        key={terminal.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, terminal: terminal.value })}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                          formData.terminal === terminal.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        {terminal.short}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <ShimmerButton
                    onClick={nextStep}
                    disabled={!canProceedStep1}
                    className={cn(
                      "w-full h-12 text-base",
                      !canProceedStep1 && "opacity-50 cursor-not-allowed"
                    )}
                    shimmerColor="oklch(0.65 0.2 45)"
                    background="oklch(0.45 0.15 240)"
                  >
                    <span className="flex items-center gap-2">
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </ShimmerButton>
                </div>
              </motion.div>
            )}

            {/* Step 2: Delivery Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-1">Delivery Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Where should we deliver and what type of container?
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="deliveryZip" className="text-sm font-medium">
                    Delivery ZIP Code <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="deliveryZip"
                    type="text"
                    value={formData.deliveryZip}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryZip: e.target.value })
                    }
                    placeholder="90210"
                    maxLength={10}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground font-mono text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    5-digit ZIP code or ZIP+4 format
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Container Type <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {containerTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, containerType: type.value })}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-medium border transition-all",
                          formData.containerType === type.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex-1 h-12 rounded-full border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <ShimmerButton
                    onClick={nextStep}
                    disabled={!canProceedStep2}
                    className={cn(
                      "flex-1 h-12 text-base",
                      !canProceedStep2 && "opacity-50 cursor-not-allowed"
                    )}
                    shimmerColor="oklch(0.65 0.2 45)"
                    background="oklch(0.45 0.15 240)"
                  >
                    <span className="flex items-center gap-2">
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </ShimmerButton>
                </div>
              </motion.div>
            )}

            {/* Step 3: Additional Details */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-1">Additional Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Optional info to help us give you a better quote.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="lfd" className="text-sm font-medium">
                    Last Free Day (LFD)
                  </label>
                  <input
                    id="lfd"
                    type="date"
                    value={formData.lfd}
                    onChange={(e) => setFormData({ ...formData, lfd: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    If your container has an approaching LFD, let us know.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special requirements, urgent situations, or additional information..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
                  />
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-secondary/50 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Quote Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Container:</div>
                    <div className="font-mono">{formData.containerNumber}</div>
                    <div className="text-muted-foreground">Terminal:</div>
                    <div>{terminals.find(t => t.value === formData.terminal)?.short}</div>
                    <div className="text-muted-foreground">Delivery ZIP:</div>
                    <div className="font-mono">{formData.deliveryZip}</div>
                    <div className="text-muted-foreground">Type:</div>
                    <div>{formData.containerType}</div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={loading}
                    className="flex-1 h-12 rounded-full border border-border bg-card text-foreground font-medium hover:bg-secondary transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <ShimmerButton
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 h-12 text-base"
                    shimmerColor="oklch(0.65 0.2 45)"
                    background="oklch(0.45 0.15 240)"
                  >
                    <span className="flex items-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Quote Request
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </span>
                  </ShimmerButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center"
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Better an honest quote in 1–2 hours</span>{" "}
            than a fake instant quote in 30 seconds.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
