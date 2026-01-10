import Link from "next/link";
import { Truck, Search, Filter } from "lucide-react";

export default function ShipmentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shipments</h1>
          <p className="text-muted-foreground mt-1">
            Track and monitor your shipments
          </p>
        </div>
        <Link
          href="/track"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Search className="h-4 w-4" />
          Track Container
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors">
          <Filter className="h-4 w-4" />
          Filter
        </button>
        <div className="flex gap-2">
          {["All", "In Transit", "Delivered", "Exception"].map((status) => (
            <button
              key={status}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                status === "All"
                  ? "bg-primary text-primary-foreground"
                  : "border hover:bg-muted"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      <div className="rounded-xl border bg-card p-12 text-center">
        <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="font-semibold text-lg mb-2">No shipments yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Once your quotes are accepted and shipments are scheduled, they&apos;ll appear here for easy tracking.
        </p>
        <Link
          href="/quote"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Request a Quote
        </Link>
      </div>
    </div>
  );
}
