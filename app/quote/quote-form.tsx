"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PORTS, quoteFormSchema } from "@/lib/validations/quote";
import { track } from "@/lib/analytics";

type FieldName = "fullName" | "companyName" | "phone" | "email" | "port" | "deliveryZip" | "notes";

const contactFields = [
  { name: "fullName", label: "Your Name", type: "text", autoComplete: "name", placeholder: "John Smith", required: true, maxLength: 100 },
  { name: "companyName", label: "Company", type: "text", autoComplete: "organization", placeholder: "Acme Logistics", required: true, maxLength: 150 },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel", placeholder: "(310) 555-1234", required: true, maxLength: 20 },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "john@acmelogistics.com", required: false, maxLength: 254 },
] as const;

export default function QuoteForm() {
  const router = useRouter();
  const submission = useRef<{ payload: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const startedAt = useRef<number | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});

  function markStarted() {
    if (startedAt.current !== null) return;
    startedAt.current = Date.now();
    track("NSL: Quote Form Started");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    markStarted();
    const form = event.currentTarget;
    const fields = Object.fromEntries(Array.from(new FormData(form), ([key, value]) => [key, String(value).trim()]));
    const input = { port: "", ...fields, requestType: "standard" };
    const parsed = quoteFormSchema.safeParse(input);
    setError(null);
    if (!parsed.success) {
      const errors: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        if (!errors[field]) errors[field] = field === "phone" && !fields.phone ? "Phone is required" : issue.message;
      }
      setFieldErrors(errors);
      track("NSL: Quote Validation Failed", { invalid_fields: Object.keys(errors) });
      const first = form.elements.namedItem(String(parsed.error.issues[0].path[0]));
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    setFieldErrors({});
    inFlight.current = true;
    setLoading(true);
    const duration_seconds = Math.round((Date.now() - (startedAt.current ?? Date.now())) / 1000);
    const port = parsed.data.port === "la" ? "la" : parsed.data.port === "lb" ? "lb" : undefined;
    track("NSL: Quote Submit Attempted", { port, duration_seconds });
    let errorType: "validation" | "rate_limit" | "conflict" | "server" | "network" | "timeout" = "network";
    try {
      const payload = JSON.stringify(input);
      if (submission.current?.payload !== payload) submission.current = { payload, key: crypto.randomUUID() };
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": submission.current.key },
        body: payload,
        signal: AbortSignal.timeout(20000),
      });
      errorType = response.status === 429 ? "rate_limit" : response.status === 409 ? "conflict" : response.status === 400 ? "validation" : "server";
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.errors?.map((issue: { message: string }) => issue.message).join("; ") || result.error || "Failed to submit quote request");
      }
      track("NSL: Quote Submit Succeeded", {
        port, duration_seconds,
        $insert_id: `quote-success:${submission.current.key}`,
      });
      const params = new URLSearchParams({ requestType: "standard" });
      if (result.referenceNumber) params.set("ref", result.referenceNumber);
      if (result.isUrgent) params.set("urgent", "true");
      router.push(`/quote/thank-you?${params.toString()}`);
    } catch (cause) {
      if (cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")) errorType = "timeout";
      track("NSL: Quote Submit Failed", { error_type: errorType });
      setError("Unable to submit your request. Please try again or call (888) 533-0302.");
      setLoading(false);
      inFlight.current = false;
      // The alert is always mounted so it can receive focus immediately.
      errorRef.current?.focus();
    }
  }

  const fieldError = (name: FieldName) => fieldErrors[name]
    ? <p id={`${name}-error`} className="text-sm text-destructive">{fieldErrors[name]}</p>
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Get Help Now</h1>
        <p className="mt-3 text-muted-foreground">
          Real dispatcher reviews every request. Usually respond within 15-30 minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} onChange={markStarted} noValidate aria-busy={loading} className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
        <div ref={errorRef} role="alert" tabIndex={-1} className={error ? "mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" : "sr-only"}>{error}</div>
        <fieldset disabled={loading} className="grid min-w-0 gap-5 sm:grid-cols-2">
          <legend className="sr-only">Quote request details</legend>
          {contactFields.map(({ label, ...field }) => (
            <div key={field.name} className="flex min-w-0 flex-col gap-2">
              <label htmlFor={field.name} className="text-sm font-medium">
                {label} {field.required ? <span aria-hidden="true">*</span> : <span className="font-normal text-muted-foreground">(optional)</span>}
              </label>
              <Input {...field} id={field.name} className="h-11" aria-invalid={!!fieldErrors[field.name]} aria-describedby={fieldErrors[field.name] ? `${field.name}-error` : undefined} />
              {fieldError(field.name)}
            </div>
          ))}
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="port" className="text-sm font-medium">Port <span aria-hidden="true">*</span></label>
            <select id="port" name="port" required defaultValue="" aria-invalid={!!fieldErrors.port} aria-describedby={fieldErrors.port ? "port-error" : undefined} className="h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 sm:text-sm">
              <option value="" disabled>Select a port</option>
              {PORTS.map(port => <option key={port.value} value={port.value}>{port.label}</option>)}
            </select>
            {fieldError("port")}
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="deliveryZip" className="text-sm font-medium">Delivery ZIP Code <span aria-hidden="true">*</span></label>
            <Input id="deliveryZip" name="deliveryZip" required inputMode="numeric" maxLength={10} autoComplete="shipping postal-code" placeholder="90210" className="h-11" aria-invalid={!!fieldErrors.deliveryZip} aria-describedby={fieldErrors.deliveryZip ? "deliveryZip-error" : undefined} />
            {fieldError("deliveryZip")}
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label htmlFor="notes" className="text-sm font-medium">Additional Details <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea id="notes" name="notes" rows={3} maxLength={1000} placeholder="Any context that would help us assist you faster..." aria-invalid={!!fieldErrors.notes} aria-describedby={fieldErrors.notes ? "notes-error" : undefined} />
            {fieldError("notes")}
          </div>
          <Button type="submit" size="lg" className="w-full sm:col-span-2" disabled={loading}>
            {loading ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Sending...</> : <>Submit Request <ArrowRight className="size-4" aria-hidden="true" /></>}
          </Button>
        </fieldset>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Need immediate help? <a href="tel:+18885330302" className="font-medium text-primary underline-offset-4 hover:underline">Call (888) 533-0302</a>
      </p>
    </div>
  );
}
