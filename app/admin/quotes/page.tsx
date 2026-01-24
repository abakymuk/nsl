import { Suspense } from "react";
import { QuoteQueue } from "@/components/admin/quote-queue";
import { QuoteMetrics } from "@/components/admin/quote-metrics";
import { Loader2 } from "lucide-react";

export default function AdminQuotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quote Queue</h1>
          <p className="text-muted-foreground mt-1">
            Prioritized quote requests with SLA tracking
          </p>
        </div>
      </div>

      {/* Metrics Dashboard */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <QuoteMetrics />
      </Suspense>

      {/* Quote Queue */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <QuoteQueue />
      </Suspense>
    </div>
  );
}
