import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { hasModuleAccess } from "@/lib/auth";

/**
 * POST /api/admin/quotes/[id]/assign
 *
 * Assign or claim a quote. Supports self-assignment (claim) or assigning to another user.
 *
 * Body:
 * - assignee_id: UUID of user to assign to, or "self" to claim
 * - reason?: string - optional reason for assignment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await hasModuleAccess("quotes"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quoteId } = await params;
    const body = await request.json();
    const { assignee_id, reason } = body;

    const supabase = createUntypedAdminClient();
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Determine actual assignee ID
    const actualAssigneeId = assignee_id === "self" ? currentUser.id : assignee_id;

    if (!actualAssigneeId) {
      return NextResponse.json(
        { error: "assignee_id is required" },
        { status: 400 }
      );
    }

    // Fetch current quote for optimistic locking
    const { data: currentQuote, error: fetchError } = await supabase
      .from("quotes")
      .select("id, assignee_id, updated_at, lifecycle_status, status")
      .eq("id", quoteId)
      .single();

    if (fetchError || !currentQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Check if quote is in a state that allows assignment
    const assignableStatuses = ["pending", "in_review", "quoted"];
    if (!assignableStatuses.includes(currentQuote.lifecycle_status || "pending")) {
      return NextResponse.json(
        { error: "Cannot assign a quote that is already accepted, rejected, or expired" },
        { status: 400 }
      );
    }

    // Check if already assigned to someone else (prevent race conditions)
    if (currentQuote.assignee_id && currentQuote.assignee_id !== actualAssigneeId) {
      // Fetch assignee name for better error message
      const { data: existingAssignee } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", currentQuote.assignee_id)
        .single();

      const assigneeName = existingAssignee?.full_name || existingAssignee?.email || "another user";

      return NextResponse.json(
        {
          error: `Quote is already assigned to ${assigneeName}`,
          currentAssigneeId: currentQuote.assignee_id,
        },
        { status: 409 } // Conflict
      );
    }

    // Update quote with assignment
    const now = new Date().toISOString();
    const { data: updatedQuote, error: updateError } = await supabase
      .from("quotes")
      .update({
        assignee_id: actualAssigneeId,
        assigned_at: now,
        updated_at: now,
        // Transition from pending to in_review on first claim
        ...(currentQuote.lifecycle_status === "pending" && {
          lifecycle_status: "in_review",
        }),
      })
      .eq("id", quoteId)
      .eq("updated_at", currentQuote.updated_at) // Optimistic locking
      .select(
        `
        *,
        assignee:profiles!quotes_assignee_id_fkey (
          id,
          full_name,
          email
        )
      `
      )
      .single();

    if (updateError) {
      // If no rows updated due to optimistic lock failure
      if (updateError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Quote was modified by another user. Please refresh and try again." },
          { status: 409 }
        );
      }
      console.error("Error assigning quote:", updateError);
      return NextResponse.json(
        { error: "Failed to assign quote" },
        { status: 500 }
      );
    }

    // Create audit log entry
    await supabase.from("quote_audit_log").insert({
      quote_id: quoteId,
      action: "assigned",
      old_status: currentQuote.lifecycle_status,
      new_status: updatedQuote.lifecycle_status,
      actor_id: currentUser.id,
      actor_type: "admin",
      metadata: {
        assignee_id: actualAssigneeId,
        reason: reason || null,
        self_claim: assignee_id === "self",
      },
    });

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      message:
        assignee_id === "self"
          ? "Quote claimed successfully"
          : "Quote assigned successfully",
    });
  } catch (error) {
    console.error("Error in POST /api/admin/quotes/[id]/assign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/quotes/[id]/assign
 *
 * Unassign a quote (remove current assignee)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await hasModuleAccess("quotes"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quoteId } = await params;
    const supabase = createUntypedAdminClient();
    const currentUser = await getUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch current quote
    const { data: currentQuote, error: fetchError } = await supabase
      .from("quotes")
      .select("id, assignee_id, lifecycle_status, status")
      .eq("id", quoteId)
      .single();

    if (fetchError || !currentQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (!currentQuote.assignee_id) {
      return NextResponse.json(
        { error: "Quote is not assigned" },
        { status: 400 }
      );
    }

    // Update quote to remove assignment
    const now = new Date().toISOString();
    const { data: updatedQuote, error: updateError } = await supabase
      .from("quotes")
      .update({
        assignee_id: null,
        assigned_at: null,
        updated_at: now,
        // Optionally transition back to pending if was in_review
        ...(currentQuote.lifecycle_status === "in_review" && {
          lifecycle_status: "pending",
        }),
      })
      .eq("id", quoteId)
      .select()
      .single();

    if (updateError) {
      console.error("Error unassigning quote:", updateError);
      return NextResponse.json(
        { error: "Failed to unassign quote" },
        { status: 500 }
      );
    }

    // Create audit log entry
    await supabase.from("quote_audit_log").insert({
      quote_id: quoteId,
      action: "unassigned",
      old_status: currentQuote.lifecycle_status,
      new_status: updatedQuote.lifecycle_status,
      actor_id: currentUser.id,
      actor_type: "admin",
      metadata: {
        previous_assignee_id: currentQuote.assignee_id,
      },
    });

    return NextResponse.json({
      success: true,
      quote: updatedQuote,
      message: "Quote unassigned successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/quotes/[id]/assign:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
