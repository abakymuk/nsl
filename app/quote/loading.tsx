import { Loader2 } from "lucide-react";

export default function QuoteLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header skeleton */}
        <div className="mb-8 text-center">
          <div className="mx-auto h-10 w-64 animate-pulse rounded-lg bg-secondary" />
          <div className="mx-auto mt-4 h-5 w-48 animate-pulse rounded-lg bg-secondary" />
        </div>

        {/* Progress steps skeleton */}
        <div className="mb-8 flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
                <div className="mt-2 h-3 w-12 animate-pulse rounded bg-secondary" />
              </div>
              {step < 3 && (
                <div className="mx-2 h-0.5 w-16 animate-pulse bg-secondary sm:w-24" />
              )}
            </div>
          ))}
        </div>

        {/* Form card skeleton */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading quote form...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
