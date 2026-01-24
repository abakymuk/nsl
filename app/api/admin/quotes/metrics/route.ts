import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/auth";

export interface QuoteMetrics {
  summary: {
    total: number;
    pending: number;
    in_review: number;
    quoted: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
  conversion: {
    quotedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    expiredCount: number;
    conversionRate: number; // accepted / (accepted + rejected + expired)
    responseRate: number; // (accepted + rejected) / quoted
  };
  timing: {
    avgTimeToQuote: number | null; // hours from created to quoted
    avgTimeToResponse: number | null; // hours from quoted to accepted/rejected
  };
  recent: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  byStatus: { status: string; count: number }[];
}

/**
 * GET /api/admin/quotes/metrics
 *
 * Get quote conversion metrics and analytics
 *
 * Query params:
 * - start_date: ISO date string for range start
 * - end_date: ISO date string for range end
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await hasModuleAccess("quotes"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createUntypedAdminClient();
    const searchParams = request.nextUrl.searchParams;

    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    // Build base query
    let query = supabase.from("quotes").select("*");

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: quotes, error } = await query;

    if (error) {
      console.error("Error fetching quotes for metrics:", error);
      return NextResponse.json(
        { error: "Failed to fetch quotes" },
        { status: 500 }
      );
    }

    const allQuotes = quotes || [];

    // Calculate summary by status
    const statusCounts: Record<string, number> = {
      pending: 0,
      in_review: 0,
      quoted: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
      cancelled: 0,
    };

    allQuotes.forEach((q) => {
      const status = q.lifecycle_status || q.status || "pending";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Calculate conversion metrics
    const quotedCount = statusCounts.quoted + statusCounts.accepted + statusCounts.rejected + statusCounts.expired;
    const acceptedCount = statusCounts.accepted;
    const rejectedCount = statusCounts.rejected;
    const expiredCount = statusCounts.expired;

    const decidedCount = acceptedCount + rejectedCount + expiredCount;
    const conversionRate = decidedCount > 0 ? (acceptedCount / decidedCount) * 100 : 0;
    const responseRate = quotedCount > 0 ? ((acceptedCount + rejectedCount) / quotedCount) * 100 : 0;

    // Calculate timing metrics
    let totalTimeToQuote = 0;
    let timeToQuoteCount = 0;
    let totalTimeToResponse = 0;
    let timeToResponseCount = 0;

    allQuotes.forEach((q) => {
      // Time to quote
      if (q.quoted_at && q.created_at) {
        const created = new Date(q.created_at).getTime();
        const quoted = new Date(q.quoted_at).getTime();
        totalTimeToQuote += (quoted - created) / (1000 * 60 * 60); // hours
        timeToQuoteCount++;
      }

      // Time to response
      if (q.quoted_at && (q.accepted_at || q.rejected_at)) {
        const quoted = new Date(q.quoted_at).getTime();
        const responded = new Date(q.accepted_at || q.rejected_at).getTime();
        totalTimeToResponse += (responded - quoted) / (1000 * 60 * 60); // hours
        timeToResponseCount++;
      }
    });

    const avgTimeToQuote = timeToQuoteCount > 0 ? totalTimeToQuote / timeToQuoteCount : null;
    const avgTimeToResponse = timeToResponseCount > 0 ? totalTimeToResponse / timeToResponseCount : null;

    // Calculate recent counts
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentCounts = {
      last24h: allQuotes.filter((q) => new Date(q.created_at) >= last24h).length,
      last7d: allQuotes.filter((q) => new Date(q.created_at) >= last7d).length,
      last30d: allQuotes.filter((q) => new Date(q.created_at) >= last30d).length,
    };

    // Build status breakdown
    const byStatus = Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const metrics: QuoteMetrics = {
      summary: {
        total: allQuotes.length,
        pending: statusCounts.pending,
        in_review: statusCounts.in_review,
        quoted: statusCounts.quoted,
        accepted: statusCounts.accepted,
        rejected: statusCounts.rejected,
        expired: statusCounts.expired,
      },
      conversion: {
        quotedCount,
        acceptedCount,
        rejectedCount,
        expiredCount,
        conversionRate: Math.round(conversionRate * 10) / 10,
        responseRate: Math.round(responseRate * 10) / 10,
      },
      timing: {
        avgTimeToQuote: avgTimeToQuote ? Math.round(avgTimeToQuote * 10) / 10 : null,
        avgTimeToResponse: avgTimeToResponse ? Math.round(avgTimeToResponse * 10) / 10 : null,
      },
      recent: recentCounts,
      byStatus,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error in GET /api/admin/quotes/metrics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
