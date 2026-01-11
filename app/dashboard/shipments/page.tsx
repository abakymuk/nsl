import { redirect } from "next/navigation";
import { getUser, createUntypedAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Truck, Search, MapPin } from "lucide-react";

const supabase = createUntypedAdminClient();

async function getCustomerCompany(email: string) {
  // First check quotes table for company name
  const { data: quoteData } = await supabase
    .from("quotes")
    .select("company_name")
    .eq("email", email)
    .limit(1)
    .single();

  if (quoteData?.company_name) return quoteData.company_name;

  // Fallback: check shipments for customer_name
  const { data: shipmentData } = await supabase
    .from("shipments")
    .select("customer_name")
    .eq("customer_email", email)
    .limit(1)
    .single();

  return shipmentData?.customer_name || null;
}

async function getShipments(email: string, companyName: string | null, status?: string) {
  // Filter by company name if available (to show all company shipments)
  const filter = companyName
    ? { column: "customer_name", value: companyName }
    : { column: "customer_email", value: email };

  let query = supabase
    .from("shipments")
    .select("*")
    .eq(filter.column, filter.value)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching shipments:", error);
    return [];
  }

  return data || [];
}

export default async function ShipmentsPage({
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

  // Get company name to show all company shipments
  const companyName = await getCustomerCompany(email);
  const shipments = await getShipments(email, companyName, status);

  const statuses = ["all", "booked", "in_transit", "delivered"];

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
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Link
            key={s}
            href={
              s === "all"
                ? "/dashboard/shipments"
                : `/dashboard/shipments?status=${s}`
            }
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              (status || "all") === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </Link>
        ))}
      </div>

      {/* Shipments List */}
      {shipments.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold text-lg mb-2">No shipments yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Once your quotes are accepted and shipments are scheduled,
            they&apos;ll appear here for easy tracking.
          </p>
          <Link
            href="/quote"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Request a Quote
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {shipments.map((shipment: any) => (
            <Link
              key={shipment.id}
              href={`/track?number=${shipment.tracking_number}`}
              className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <code className="text-lg font-bold font-mono">
                      {shipment.tracking_number}
                    </code>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        shipment.status === "delivered"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : shipment.status === "in_transit"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : shipment.status === "at_port"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          : shipment.status === "out_for_delivery"
                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {shipment.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Container: {shipment.container_number}
                  </p>
                </div>
                {shipment.eta && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">ETA</p>
                    <p className="font-medium">
                      {new Date(shipment.eta).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">
                    {shipment.origin || "—"}
                  </span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground">
                    {shipment.destination || "—"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
