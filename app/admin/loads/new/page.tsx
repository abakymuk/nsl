import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadCreationForm } from "./load-creation-form";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getQuote(quoteId: string) {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (error) return null;
  return data;
}

export default async function NewLoadPage({
  searchParams,
}: {
  searchParams: Promise<{ quote_id?: string }>;
}) {
  const { quote_id } = await searchParams;

  let quote = null;
  if (quote_id) {
    quote = await getQuote(quote_id);
    if (!quote) {
      redirect("/admin/quotes");
    }
    // Verify quote is in accepted status
    if (quote.status !== "accepted") {
      redirect(`/admin/quotes/${quote_id}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={quote_id ? `/admin/quotes/${quote_id}` : "/admin/loads"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {quote_id ? "Back to Quote" : "Back to Loads"}
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Create New Load</h1>
        <p className="text-muted-foreground mt-1">
          {quote
            ? `Creating load from quote ${quote.reference_number}`
            : "Manually create a new load"}
        </p>
      </div>

      {quote && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">Pre-filled from Quote</p>
          <p className="text-xs text-muted-foreground mt-1">
            Container {quote.container_number} • {quote.pickup_terminal} → {quote.delivery_zip}
            {quote.quoted_price && ` • $${quote.quoted_price.toLocaleString()}`}
          </p>
        </div>
      )}

      <LoadCreationForm quote={quote} />
    </div>
  );
}
