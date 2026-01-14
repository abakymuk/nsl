import { redirect } from "next/navigation";
import { getUser, createUntypedAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FileText, Plus, ChevronRight } from "lucide-react";

const supabase = createUntypedAdminClient();

async function getCustomerCompany(email: string) {
  const { data } = await supabase
    .from("quotes")
    .select("company_name")
    .eq("email", email)
    .limit(1)
    .single();

  return data?.company_name || null;
}

async function getQuotes(email: string, companyName: string | null, status?: string) {
  // Filter by company name if available (to show all company quotes)
  const filter = companyName
    ? { column: "company_name", value: companyName }
    : { column: "email", value: email };

  let query = supabase
    .from("quotes")
    .select("*")
    .eq(filter.column, filter.value)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching quotes:", error);
    return [];
  }

  return data || [];
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const email = user.email || "";
  const { status } = await searchParams;

  // Get company name to show all company quotes
  const companyName = await getCustomerCompany(email);
  const quotes = await getQuotes(email, companyName, status);

  const statuses = ["all", "pending", "quoted", "accepted", "rejected"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotes</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your quote requests
          </p>
        </div>
        <Link
          href="/quote"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Quote
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/dashboard/quotes" : `/dashboard/quotes?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              (status || "all") === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {/* Quotes List */}
      {quotes.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold text-lg mb-2">No quotes yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            You haven&apos;t submitted any quote requests yet. Get started by
            requesting your first quote.
          </p>
          <Link
            href="/quote"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Request Your First Quote
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Container
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quotes.map((quote: any) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-sm">
                        {quote.service_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {quote.container_number || "N/A"}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">
                        {quote.pickup_location && quote.delivery_location
                          ? `${quote.pickup_location.substring(0, 15)}... → ${quote.delivery_location.substring(0, 15)}...`
                          : "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          quote.status === "pending"
                            ? "bg-warning/15 text-warning"
                            : quote.status === "quoted"
                            ? "bg-primary/15 text-primary"
                            : quote.status === "accepted"
                            ? "bg-success/15 text-success"
                            : quote.status === "rejected"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {quote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {quote.quoted_price ? (
                        <span className="font-semibold text-primary">
                          ${quote.quoted_price.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-muted-foreground">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
