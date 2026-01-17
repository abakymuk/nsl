"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  User,
  Loader2,
  Building2,
  Mail,
  Phone,
  Container,
  Truck,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  PhoneCall,
} from "lucide-react";
import type { QuoteFormData } from "@/types";
import { cn } from "@/lib/utils";
import { IntercomEvents } from "@/lib/intercom";
import {
  VALID_TERMINALS,
  REQUEST_TYPES,
  DELIVERY_TYPES,
  PORTS,
} from "@/lib/validations/quote";

const terminals = [
  { value: "YTI (Yusen Terminals)", short: "YTI" },
  { value: "PCT (Pacific Container Terminal)", short: "PCT" },
  { value: "Pier A", short: "Pier A" },
  { value: "FMS (Fenix Marine Services)", short: "FMS" },
  { value: "LBCT (Long Beach Container Terminal)", short: "LBCT" },
  { value: "WBCT (West Basin Container Terminal)", short: "WBCT" },
  { value: "TraPac", short: "TraPac" },
  { value: "Everport Terminal Services", short: "Everport" },
  { value: "TTI (Total Terminals International)", short: "TTI" },
  { value: "Shippers Transport", short: "Shippers" },
  { value: "APM Terminals", short: "APM" },
  { value: "ITS", short: "ITS" },
];

const steps = [
  { id: 1, name: "Request", icon: Phone, number: "01" },
  { id: 2, name: "Container", icon: Container, number: "02" },
  { id: 3, name: "Delivery", icon: Truck, number: "03" },
];

const phoneRegex = /^(\+1)?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function QuoteForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<QuoteFormData>({
    // Step 1: Contact & Request
    fullName: "",
    companyName: "",
    phone: "",
    email: "",
    port: "la",
    requestType: "standard",
    timeSensitive: false,
    // Step 2: Container & Pickup
    containerNumber: "",
    terminal: "",
    lfd: "",
    availabilityDate: "",
    notes: "",
    // Step 3: Delivery
    deliveryZip: "",
    deliveryType: "warehouse",
    appointmentRequired: false,
    // Legacy (for API compatibility)
    containerType: "40ft",
    moveType: "import",
  });

  useEffect(() => {
    IntercomEvents.quoteStarted();
  }, []);

  // Step 1 validation: Name, Company, Phone required
  const canProceedStep1 =
    formData.fullName.length >= 2 &&
    formData.companyName.length >= 2 &&
    formData.phone.length >= 10 &&
    phoneRegex.test(formData.phone.replace(/\s/g, "")) &&
    formData.port &&
    formData.requestType;

  // Step 2 validation: All optional, can always proceed
  const canProceedStep2 = true;

  // Step 3 validation: ZIP required
  const canSubmit = formData.deliveryZip.match(/^\d{5}(-\d{4})?$/);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit quote request");
      }

      const result = await response.json();
      IntercomEvents.quoteSubmitted({
        container: formData.containerNumber || "not_provided",
        terminal: formData.terminal || "not_selected",
        zip: formData.deliveryZip,
        containerType: formData.containerType || "not_selected",
      });

      const params = new URLSearchParams();
      if (result.referenceNumber) params.set("ref", result.referenceNumber);
      if (formData.containerNumber) params.set("container", formData.containerNumber);
      params.set("requestType", formData.requestType);
      if (result.isUrgent) params.set("urgent", "true");
      router.push(`/quote/thank-you?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      IntercomEvents.quoteStepCompleted(currentStep);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const currentStepData = steps.find((s) => s.id === currentStep);

  // Check if this is an urgent request type
  const isUrgentRequest = ["urgent_lfd", "rolled", "hold_released"].includes(
    formData.requestType
  );

  return (
    <div className="w-full">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
            </span>
            Real quotes in 15 min
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Get Help Now
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Real dispatcher reviews every request. Usually respond within 15-30 minutes.
          </p>
        </motion.div>

        {/* Urgent Call CTA - Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 lg:hidden"
        >
          <a
            href="tel:+13109551234"
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-green-500/10 border-2 border-green-500/30 text-green-700 dark:text-green-400 font-semibold hover:bg-green-500/20 transition-colors"
          >
            <PhoneCall className="h-5 w-5" />
            Urgent? Call (310) 955-1234
          </a>
        </motion.div>

        {/* Progress Journey */}
        <div className="mb-8">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
            <motion.div
              className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-gradient-to-r from-primary to-accent"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />

            {steps.map((step) => (
              <motion.div
                key={step.id}
                className="relative z-10 flex flex-col items-center"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: step.id * 0.1 }}
              >
                <motion.button
                  type="button"
                  onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                  disabled={step.id > currentStep}
                  className={cn(
                    "relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300 font-mono text-lg font-bold",
                    currentStep === step.id
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : currentStep > step.id
                      ? "border-primary bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                      : "border-border bg-card text-muted-foreground cursor-not-allowed"
                  )}
                  whileHover={step.id < currentStep ? { scale: 1.05 } : {}}
                  whileTap={step.id < currentStep ? { scale: 0.95 } : {}}
                >
                  {currentStep > step.id ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    step.number
                  )}
                </motion.button>
                <span
                  className={cn(
                    "mt-2 text-xs font-semibold tracking-wide uppercase",
                    currentStep >= step.id
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <motion.div
          className="relative overflow-hidden rounded-3xl border-2 border-border bg-card shadow-xl shadow-primary/5 p-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />

          <div className="relative rounded-[22px] bg-card p-6 sm:p-8">
            <div
              className="absolute inset-0 opacity-[0.02] pointer-events-none rounded-[22px]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />

            <div className="absolute -right-4 -top-8 font-mono text-[12rem] font-black text-primary/[0.03] pointer-events-none select-none leading-none">
              {currentStepData?.number}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {/* Step 1: What's going on? */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">What&apos;s going on?</h2>
                      <p className="text-sm text-muted-foreground">
                        Tell us about your situation - we&apos;ll help fast
                      </p>
                    </div>
                  </div>

                  {/* Name & Company */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="fullName"
                        className="text-sm font-semibold text-foreground uppercase tracking-wide"
                      >
                        Your Name <span className="text-accent">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="fullName"
                          type="text"
                          value={formData.fullName}
                          onChange={(e) =>
                            setFormData({ ...formData, fullName: e.target.value })
                          }
                          placeholder="John Smith"
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-secondary/50 border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="companyName"
                        className="text-sm font-semibold text-foreground uppercase tracking-wide"
                      >
                        Company <span className="text-accent">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="companyName"
                          type="text"
                          value={formData.companyName}
                          onChange={(e) =>
                            setFormData({ ...formData, companyName: e.target.value })
                          }
                          placeholder="Acme Logistics"
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-secondary/50 border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone (required) & Email (optional) */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="phone"
                        className="text-sm font-semibold text-foreground uppercase tracking-wide"
                      >
                        Phone <span className="text-accent">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          placeholder="(310) 555-1234"
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-secondary/50 border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-background transition-all"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        For urgent calls - we respond fastest by phone
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="text-sm font-semibold text-foreground uppercase tracking-wide"
                      >
                        Email{" "}
                        <span className="text-muted-foreground text-xs normal-case">
                          (optional)
                        </span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="email"
                          type="email"
                          value={formData.email || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="john@acmelogistics.com"
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-secondary/50 border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Port Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Port <span className="text-accent">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {PORTS.map((port) => (
                        <motion.button
                          key={port.value}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, port: port.value as "la" | "lb" })
                          }
                          className={cn(
                            "relative px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left font-semibold",
                            formData.port === port.value
                              ? "border-primary bg-primary/10 text-primary shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                              : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                          )}
                          whileTap={{ scale: 0.98 }}
                        >
                          {port.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Request Type */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      What do you need? <span className="text-accent">*</span>
                    </label>
                    <div className="grid gap-2">
                      {REQUEST_TYPES.map((type) => (
                        <motion.button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, requestType: type.value })
                          }
                          className={cn(
                            "relative px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left flex items-center gap-3",
                            formData.requestType === type.value
                              ? type.score >= 1
                                ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/30 text-foreground hover:border-primary/30"
                          )}
                          whileTap={{ scale: 0.98 }}
                        >
                          {type.score >= 1 && (
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                          )}
                          <span className="font-semibold">{type.label}</span>
                          {type.score >= 2 && (
                            <span className="ml-auto text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                              Priority
                            </span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Time-sensitive checkbox */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.timeSensitive}
                      onChange={(e) =>
                        setFormData({ ...formData, timeSensitive: e.target.checked })
                      }
                      className="mt-0.5 h-5 w-5 rounded border-border text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        Time-sensitive / penalties may apply
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Check this if you&apos;re facing demurrage, per-diem, or LFD deadlines
                      </span>
                    </div>
                  </label>

                  {/* Continue Button */}
                  <div className="pt-4">
                    <motion.button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceedStep1}
                      className={cn(
                        "w-full h-14 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3",
                        canProceedStep1
                          ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                      whileHover={canProceedStep1 ? { scale: 1.01 } : {}}
                      whileTap={canProceedStep1 ? { scale: 0.99 } : {}}
                    >
                      Continue
                      <ArrowRight className="h-5 w-5" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Container & Pickup */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                      <Container className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Container & Pickup</h2>
                      <p className="text-sm text-muted-foreground">
                        Share what you know - we can help without all details
                      </p>
                    </div>
                  </div>

                  {/* Container Number - Optional */}
                  <div className="space-y-2">
                    <label
                      htmlFor="containerNumber"
                      className="text-sm font-semibold text-foreground uppercase tracking-wide"
                    >
                      Container Number{" "}
                      <span className="text-muted-foreground text-xs normal-case">
                        (optional)
                      </span>
                    </label>
                    <div className="relative group">
                      <input
                        id="containerNumber"
                        type="text"
                        value={formData.containerNumber || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            containerNumber: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="MSCU1234567"
                        className="w-full h-14 px-5 rounded-xl bg-secondary/50 border-2 border-border text-foreground font-mono text-xl tracking-wider placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:bg-background transition-all"
                      />
                      {formData.containerNumber && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground uppercase">
                          {formData.containerNumber.length}/11
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Don&apos;t have it yet? No problem - submit anyway and we&apos;ll follow up
                    </p>
                  </div>

                  {/* Terminal Selection - Optional */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Pickup Terminal{" "}
                      <span className="text-muted-foreground text-xs normal-case">
                        (optional)
                      </span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {terminals.map((terminal) => (
                        <motion.button
                          key={terminal.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              terminal: formData.terminal === terminal.value ? "" : terminal.value,
                            })
                          }
                          className={cn(
                            "relative px-3 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 overflow-hidden",
                            formData.terminal === terminal.value
                              ? "border-accent bg-accent/10 text-accent shadow-[0_0_20px_rgba(249,115,22,0.15)]"
                              : "border-border bg-secondary/30 text-muted-foreground hover:border-accent/30 hover:text-foreground hover:bg-secondary/50"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {terminal.short}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="lfd"
                        className="text-sm font-semibold text-foreground uppercase tracking-wide"
                      >
                        Last Free Day (LFD){" "}
                        <span className="text-muted-foreground text-xs normal-case">
                          (optional)
                        </span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="lfd"
                          type="date"
                          value={formData.lfd || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, lfd: e.target.value })
                          }
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-secondary/50 border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="availabilityDate"
                        className="text-sm font-semibold text-foreground uppercase tracking-wide"
                      >
                        Available Date{" "}
                        <span className="text-muted-foreground text-xs normal-case">
                          (optional)
                        </span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          id="availabilityDate"
                          type="date"
                          value={formData.availabilityDate || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, availabilityDate: e.target.value })
                          }
                          className="w-full h-12 pl-11 pr-4 rounded-xl bg-secondary/50 border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label
                      htmlFor="notes"
                      className="text-sm font-semibold text-foreground uppercase tracking-wide"
                    >
                      Additional Details{" "}
                      <span className="text-muted-foreground text-xs normal-case">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="Any context that would help us assist you faster..."
                      className="w-full px-4 py-3 rounded-xl bg-secondary/50 border-2 border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:bg-background transition-all resize-none"
                    />
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-4 flex gap-3">
                    <motion.button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 h-14 rounded-xl font-bold border-2 border-border bg-secondary/50 text-foreground hover:bg-secondary hover:border-border transition-all flex items-center justify-center gap-2"
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                      Back
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={nextStep}
                      className="flex-[2] h-14 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 bg-gradient-to-r from-accent to-accent/80 text-white shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      Continue
                      <ArrowRight className="h-5 w-5" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Delivery */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                      <Truck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Delivery Details</h2>
                      <p className="text-sm text-muted-foreground">
                        Where should we deliver?
                      </p>
                    </div>
                  </div>

                  {/* Delivery ZIP */}
                  <div className="space-y-2">
                    <label
                      htmlFor="deliveryZip"
                      className="text-sm font-semibold text-foreground uppercase tracking-wide"
                    >
                      Delivery ZIP Code <span className="text-accent">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input
                        id="deliveryZip"
                        type="text"
                        value={formData.deliveryZip}
                        onChange={(e) =>
                          setFormData({ ...formData, deliveryZip: e.target.value })
                        }
                        placeholder="90210"
                        maxLength={10}
                        className="w-full h-14 pl-12 pr-5 rounded-xl bg-secondary/50 border-2 border-border text-foreground font-mono text-xl tracking-wider placeholder:text-muted-foreground focus:outline-none focus:border-green-500 focus:bg-background transition-all"
                      />
                    </div>
                  </div>

                  {/* Delivery Type */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                      Delivery Type{" "}
                      <span className="text-muted-foreground text-xs normal-case">
                        (optional)
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {DELIVERY_TYPES.map((type) => (
                        <motion.button
                          key={type.value}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, deliveryType: type.value as QuoteFormData["deliveryType"] })
                          }
                          className={cn(
                            "relative px-4 py-3 rounded-xl border-2 transition-all duration-200 font-semibold",
                            formData.deliveryType === type.value
                              ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                              : "border-border bg-secondary/30 text-muted-foreground hover:border-green-500/30 hover:text-foreground"
                          )}
                          whileTap={{ scale: 0.98 }}
                        >
                          {type.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Appointment checkbox */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-border bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.appointmentRequired}
                      onChange={(e) =>
                        setFormData({ ...formData, appointmentRequired: e.target.checked })
                      }
                      className="mt-0.5 h-5 w-5 rounded border-border text-green-500 focus:ring-green-500"
                    />
                    <div>
                      <span className="font-semibold text-foreground">
                        Appointment required at delivery
                      </span>
                      <span className="text-sm text-muted-foreground block">
                        Check if the receiver requires a scheduled delivery window
                      </span>
                    </div>
                  </label>

                  {/* Summary Card */}
                  <div className="rounded-xl bg-secondary/80 border-2 border-border overflow-hidden">
                    <div className="px-4 py-2 bg-secondary border-b border-border flex items-center justify-between">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Request Summary
                      </h3>
                      {(isUrgentRequest || formData.timeSensitive) && (
                        <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                          Priority Request
                        </span>
                      )}
                    </div>
                    <div className="p-4 font-mono text-sm">
                      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                        <span className="text-muted-foreground">TYPE</span>
                        <span className="text-foreground font-semibold">
                          {REQUEST_TYPES.find((r) => r.value === formData.requestType)?.label || "—"}
                        </span>
                        <span className="text-muted-foreground">PORT</span>
                        <span className="text-foreground">
                          {formData.port === "la" ? "Los Angeles" : "Long Beach"}
                        </span>
                        {formData.containerNumber && (
                          <>
                            <span className="text-muted-foreground">CNTR</span>
                            <span className="text-foreground font-bold">
                              {formData.containerNumber}
                            </span>
                          </>
                        )}
                        {formData.terminal && (
                          <>
                            <span className="text-muted-foreground">TERM</span>
                            <span className="text-foreground">
                              {terminals.find((t) => t.value === formData.terminal)?.short || "—"}
                            </span>
                          </>
                        )}
                        <span className="text-muted-foreground">DEST</span>
                        <span className="text-foreground">
                          {formData.deliveryZip || "—"}
                        </span>
                        <span className="text-muted-foreground">CONTACT</span>
                        <span className="text-foreground">
                          {formData.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trust anchor */}
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      A real dispatcher reviews every request. If urgent, we usually respond within 15-30 minutes during business hours (Mon-Fri 6am-6pm PT).
                    </p>
                  </div>

                  {/* Navigation & Submit */}
                  <div className="pt-4 flex gap-3">
                    <motion.button
                      type="button"
                      onClick={prevStep}
                      disabled={loading}
                      className="flex-1 h-14 rounded-xl font-bold border-2 border-border bg-secondary/50 text-foreground hover:bg-secondary hover:border-border transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft className="h-5 w-5" />
                      Back
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !canSubmit}
                      className={cn(
                        "flex-[2] h-14 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3",
                        canSubmit && !loading
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                      whileHover={canSubmit && !loading ? { scale: 1.01 } : {}}
                      whileTap={canSubmit && !loading ? { scale: 0.99 } : {}}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Request
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-green-500/10 border-2 border-green-500/20 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="font-bold text-green-700 dark:text-green-500">15-30 min response</span>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary/10 border-2 border-primary/20 shadow-sm">
            <Package className="h-4 w-4 text-primary" />
            <span className="font-bold text-primary">Real dispatchers</span>
          </div>
        </motion.div>

        {/* Desktop Call CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center hidden lg:block"
        >
          <p className="text-sm text-muted-foreground">
            Need immediate help?{" "}
            <a
              href="tel:+13109551234"
              className="text-green-600 dark:text-green-400 font-semibold hover:underline"
            >
              Call (310) 955-1234
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
