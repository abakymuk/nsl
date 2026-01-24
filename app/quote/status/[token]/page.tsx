import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  ArrowRight,
  Phone,
} from "lucide-react";
import { validateToken, getOrCreateAcceptToken, buildAcceptUrl } from "@/lib/quotes/tokens";
import { QuoteStatus } from "@/types/database";
import { logQuoteActivity } from "@/lib/notifications";

interface StatusPageProps {
  params: Promise<{ token: string }>;
}

// Status configuration for display
const STATUS_CONFIG: Record<
  QuoteStatus,
  {
    icon: typeof CheckCircle;
    label: string;
    color: string;
    description: string;
  }
> = {
  pending: {
    icon: Clock,
    label: "Under Review",
    color: "text-warning",
    description: "Our team is reviewing your quote request",
  },
  in_review: {
    icon: Clock,
    label: "Under Review",
    color: "text-primary",
    description: "Our team is actively working on your quote",
  },
  quoted: {
    icon: DollarSign,
    label: "Quote Ready",
    color: "text-success",
    description: "Your quote is ready for review",
  },
  accepted: {
    icon: CheckCircle,
    label: "Accepted",
    color: "text-success",
    description: "Quote accepted - we will begin processing your shipment",
  },
  rejected: {
    icon: XCircle,
    label: "Declined",
    color: "text-muted-foreground",
    description: "This quote was declined",
  },
  expired: {
    icon: AlertTriangle,
    label: "Expired",
    color: "text-muted-foreground",
    description: "This quote has expired",
  },
  cancelled: {
    icon: XCircle,
    label: "Cancelled",
    color: "text-muted-foreground",
    description: "This quote was cancelled",
  },
};

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getTimeRemaining(expiresAt: string | null): {
  label: string;
  urgent: boolean;
} {
  if (!expiresAt) return { label: "N/A", urgent: false };

  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { label: "Expired", urgent: true };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) {
    return { label: `${diffDays} days remaining`, urgent: false };
  } else if (diffHours > 1) {
    return { label: `${diffHours} hours remaining`, urgent: diffHours < 24 };
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return { label: `${diffMinutes} minutes remaining`, urgent: true };
  }
}

export default async function QuoteStatusPage({ params }: StatusPageProps) {
  const { token } = await params;

  // Validate token and fetch quote
  const result = await validateToken(token, "status");

  if (!result) {
    notFound();
  }

  const { quote } = result;

  // Log customer activity (non-blocking)
  const headersList = await headers();
  const ipAddress = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = headersList.get("user-agent");

  // Fire and forget - don't block page render
  logQuoteActivity(quote.id, "status_viewed", {
    ipAddress,
    userAgent,
  }).catch((err) => console.error("Failed to log activity:", err));
  const status = (quote.lifecycle_status || quote.status) as QuoteStatus;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  // Calculate time remaining for quoted status
  const timeRemaining = status === "quoted" ? getTimeRemaining(quote.expires_at) : null;

  // Get accept URL if quote is ready (generate proper accept token)
  let acceptUrl: string | null = null;
  if (status === "quoted") {
    const acceptToken = await getOrCreateAcceptToken(quote.id);
    if (acceptToken) {
      acceptUrl = buildAcceptUrl(acceptToken);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-2xl font-bold">New Stream Logistics</h1>
          </Link>
          <p className="text-muted-foreground">Quote Status</p>
        </div>

        {/* Status Card */}
        <div className="bg-card rounded-2xl shadow-lg border overflow-hidden">
          {/* Status Header */}
          <div className={`p-6 text-center border-b ${statusConfig.color}`}>
            <StatusIcon className="h-12 w-12 mx-auto mb-3" />
            <h2 className="text-2xl font-bold">{statusConfig.label}</h2>
            <p className="text-sm mt-1 opacity-80">{statusConfig.description}</p>
          </div>

          {/* Quote Details */}
          <div className="p-6 space-y-6">
            {/* Reference */}
            <div className="text-center pb-4 border-b">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Reference Number
              </p>
              <p className="font-mono text-lg font-medium">{quote.reference_number}</p>
            </div>

            {/* Container & Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Container</p>
                  <p className="font-mono font-medium">
                    {quote.container_number || "TBD"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Delivery</p>
                  <p className="font-medium">{quote.delivery_zip}</p>
                </div>
              </div>
            </div>

            {/* Terminal & LFD */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Terminal</p>
                  <p className="font-medium">{quote.pickup_terminal || "TBD"}</p>
                </div>
              </div>
              {quote.lfd && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Free Day</p>
                    <p className="font-medium">{formatDate(quote.lfd)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing (only if quoted) */}
            {status === "quoted" && (quote.total_price || quote.quoted_price) && (
              <div className="bg-success/10 rounded-xl p-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Quoted Price
                </p>
                <p className="text-4xl font-bold text-success">
                  {formatCurrency(quote.total_price || quote.quoted_price)}
                </p>
                {timeRemaining && (
                  <p
                    className={`text-sm mt-2 ${
                      timeRemaining.urgent ? "text-warning font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <Clock className="h-4 w-4 inline mr-1" />
                    {timeRemaining.label}
                  </p>
                )}
              </div>
            )}

            {/* Accepted confirmation */}
            {status === "accepted" && (
              <div className="bg-success/10 rounded-xl p-6 text-center">
                <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                <p className="font-medium">Quote Accepted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Accepted on {formatDate(quote.accepted_at)}
                </p>
              </div>
            )}

            {/* Expired message */}
            {status === "expired" && (
              <div className="bg-muted rounded-xl p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium">Quote Expired</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This quote is no longer valid. Please request a new quote.
                </p>
                <Link
                  href="/quote"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  Request New Quote
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Action Footer (for quoted status) */}
          {status === "quoted" && acceptUrl && (
            <div className="p-6 bg-muted/50 border-t">
              <Link
                href={acceptUrl}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-success text-white rounded-xl font-medium hover:bg-success/90 transition-colors"
              >
                Accept Quote
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Review full details and accept or decline this quote
              </p>
            </div>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">Questions about your quote?</p>
          <a
            href="tel:+18885330302"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <Phone className="h-4 w-4" />
            (888) 533-0302
          </a>
        </div>

        {/* Timeline (simplified) */}
        <div className="mt-8 bg-card rounded-xl border p-6">
          <h3 className="font-medium mb-4">Quote Timeline</h3>
          <div className="space-y-4">
            <TimelineItem
              icon={Clock}
              label="Quote Requested"
              date={formatDate(quote.created_at)}
              active={true}
            />
            {quote.first_response_at && (
              <TimelineItem
                icon={CheckCircle}
                label="Quote Prepared"
                date={formatDate(quote.first_response_at)}
                active={true}
              />
            )}
            {quote.quoted_at && (
              <TimelineItem
                icon={DollarSign}
                label="Quote Sent"
                date={formatDate(quote.quoted_at)}
                active={true}
              />
            )}
            {quote.accepted_at && (
              <TimelineItem
                icon={CheckCircle}
                label="Quote Accepted"
                date={formatDate(quote.accepted_at)}
                active={true}
              />
            )}
            {quote.rejected_at && (
              <TimelineItem
                icon={XCircle}
                label="Quote Declined"
                date={formatDate(quote.rejected_at)}
                active={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  label,
  date,
  active,
}: {
  icon: typeof Clock;
  label: string;
  date: string;
  active: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${active ? "" : "opacity-50"}`}>
      <div
        className={`p-2 rounded-full ${
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    </div>
  );
}
