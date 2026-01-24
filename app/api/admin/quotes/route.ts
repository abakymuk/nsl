import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/auth";
import {
  calculateQuotePriority,
  getSLAStatus,
  SLAStatus,
} from "@/lib/quotes/priority";
import { Quote, QuoteStatus } from "@/types/database";

export interface QuoteQueueItem extends Quote {
  priority: {
    score: number;
    slaStatus: SLAStatus;
    hoursPending: number;
  };
  assignee?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export interface QuoteQueueResponse {
  quotes: QuoteQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * GET /api/admin/quotes
 *
 * Fetch paginated, filterable quote queue with priority scoring
 *
 * Query params:
 * - status: QuoteStatus or comma-separated list
 * - sla_status: SLAStatus or comma-separated list
 * - assignee_id: UUID or "unassigned"
 * - search: Search company_name, contact_name, email, container_number
 * - sort_by: "priority" | "created_at" | "company_name"
 * - sort_order: "asc" | "desc"
 * - page: number (1-indexed)
 * - limit: number (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await hasModuleAccess("quotes"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createUntypedAdminClient();
    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const statusParam = searchParams.get("status");
    const slaStatusParam = searchParams.get("sla_status");
    const assigneeId = searchParams.get("assignee_id");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sort_by") || "priority";
    const sortOrder = searchParams.get("sort_order") || "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("quotes")
      .select(
        `
        *,
        assignee:profiles!assignee_id (
          id,
          full_name,
          email
        )
      `,
        { count: "exact" }
      );

    // Filter by status (can be comma-separated)
    // Use status column for compatibility (lifecycle_status may not exist yet)
    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim());
      query = query.in("status", statuses);
    } else {
      // Default: show pending, in_review, quoted (active quotes)
      query = query.in("status", ["pending", "in_review", "quoted"]);
    }

    // Filter by assignee
    if (assigneeId) {
      if (assigneeId === "unassigned") {
        query = query.is("assignee_id", null);
      } else {
        query = query.eq("assignee_id", assigneeId);
      }
    }

    // Search filter
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(
        `company_name.ilike.${searchTerm},contact_name.ilike.${searchTerm},email.ilike.${searchTerm},container_number.ilike.${searchTerm},reference_number.ilike.${searchTerm}`
      );
    }

    // Sorting for database query
    // Priority sorting is done in-memory after fetching
    if (sortBy === "created_at" || sortBy === "company_name") {
      query = query.order(sortBy, { ascending: sortOrder === "asc" });
    } else {
      // For priority sorting, order by created_at desc to get newest first
      // then re-sort in memory by priority
      query = query.order("created_at", { ascending: false });
    }

    // Execute query
    const { data: rawQuotes, error, count } = await query;

    if (error) {
      console.error("Error fetching quotes:", error);
      return NextResponse.json(
        { error: "Failed to fetch quotes" },
        { status: 500 }
      );
    }

    // Calculate priority for each quote and filter by SLA status if needed
    let quotes: QuoteQueueItem[] = (rawQuotes || []).map((quote) => {
      const priority = calculateQuotePriority(quote as Quote);
      return {
        ...quote,
        priority: {
          score: priority.score,
          slaStatus: priority.slaStatus,
          hoursPending: priority.hoursPending,
        },
      } as QuoteQueueItem;
    });

    // Filter by SLA status (in-memory since it's computed)
    if (slaStatusParam) {
      const slaStatuses = slaStatusParam.split(",").map((s) => s.trim()) as SLAStatus[];
      quotes = quotes.filter((q) => slaStatuses.includes(q.priority.slaStatus));
    }

    // Sort by priority if requested (in-memory)
    if (sortBy === "priority") {
      quotes.sort((a, b) => {
        const diff = b.priority.score - a.priority.score;
        return sortOrder === "asc" ? -diff : diff;
      });
    }

    // Apply pagination (for priority sorting, we paginate after sorting)
    const paginatedQuotes =
      sortBy === "priority" ? quotes.slice(offset, offset + limit) : quotes;
    const total = sortBy === "priority" ? quotes.length : (count || 0);

    const response: QuoteQueueResponse = {
      quotes: paginatedQuotes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/admin/quotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
