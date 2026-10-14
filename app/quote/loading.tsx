export default function QuoteLoading() {
  return (
    <div role="status" className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mx-auto mb-6 h-10 w-64 animate-pulse rounded-lg bg-secondary" />
      <div className="h-96 animate-pulse rounded-2xl border bg-card" />
      <span className="sr-only">Loading quote form...</span>
    </div>
  );
}
