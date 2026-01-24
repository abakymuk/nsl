import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building2, MapPin, Package, Calendar } from "lucide-react";
import { QuoteActions } from "./quote-actions";

// Lazy initialization to avoid module-scope env var access during build
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, key);
}

async function getQuote(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);

  if (!quote) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/quotes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quotes
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{quote.company_name}</h1>
          <p className="text-muted-foreground mt-1">
            Quote #{quote.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
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
          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Contact Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">{quote.company_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${quote.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {quote.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${quote.phone}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {quote.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">
                    {new Date(quote.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Service Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Service Type</p>
                <p className="font-medium mt-1">{quote.service_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Container Size</p>
                <p className="font-medium mt-1">{quote.container_size || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Container Number</p>
                <code className="font-mono bg-muted px-2 py-1 rounded text-sm">
                  {quote.container_number || "Not provided"}
                </code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Weight</p>
                <p className="font-medium mt-1">
                  {quote.weight ? `${quote.weight} lbs` : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold mb-4">Locations</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">Pickup Location</p>
                </div>
                <p className="font-medium">{quote.pickup_location || "N/A"}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <p className="text-xs text-muted-foreground">Delivery Location</p>
                </div>
                <p className="font-medium">{quote.delivery_location || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {quote.notes && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold mb-4">Additional Notes</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {quote.notes}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <QuoteActions quote={quote} />
        </div>
      </div>
    </div>
  );
}
