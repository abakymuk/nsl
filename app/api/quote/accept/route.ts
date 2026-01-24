import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { validateToken, markTokenUsed } from "@/lib/quotes/tokens";
import { QuoteStatus } from "@/types/database";

interface AcceptRequest {
  token: string;
  action: "accept" | "reject";
  signature?: string;
  rejection_reason?: string;
  rejection_notes?: string;
}

/**
 * POST /api/quote/accept
 *
 * Process customer acceptance or rejection of a quote
 * This is a public endpoint - auth via token
 */
export async function POST(request: NextRequest) {
  try {
    const body: AcceptRequest = await request.json();
    const { token, action, signature, rejection_reason, rejection_notes } = body;

    // Validate required fields
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    if (action === "accept" && !signature?.trim()) {
      return NextResponse.json(
        { error: "Signature is required to accept" },
        { status: 400 }
      );
    }

    if (action === "reject" && !rejection_reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Validate token
    const result = await validateToken(token, "accept");

    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 }
      );
    }

    const { quote, tokenRecord } = result;

    // Verify quote is in correct state
    const currentStatus = quote.lifecycle_status || quote.status;
    if (currentStatus !== "quoted") {
      const message = "Quote is no longer available";
      if (currentStatus === "accepted") {
        // Return success for idempotency
        return NextResponse.json({
          success: true,
          message: "Quote has already been accepted",
          confirmationNumber: quote.reference_number,
        });
      } else if (currentStatus === "rejected") {
        return NextResponse.json(
          { error: "Quote has already been declined" },
          { status: 400 }
        );
      } else if (currentStatus === "expired") {
        return NextResponse.json(
          { error: "Quote has expired" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Check quote expiration
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Quote has expired" },
        { status: 400 }
      );
    }

    const supabase = createUntypedAdminClient();
    const now = new Date().toISOString();

    // Get client IP for audit
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : null;

    // Prepare update data
    const newStatus: QuoteStatus = action === "accept" ? "accepted" : "rejected";
    const updateData: Record<string, unknown> = {
      lifecycle_status: newStatus,
      status: newStatus, // Also update legacy status field
      updated_at: now,
    };

    if (action === "accept") {
      updateData.accepted_at = now;
      updateData.accepted_signature = signature?.trim();
      updateData.accepted_ip = ip;
    } else {
      updateData.rejected_at = now;
      updateData.rejection_reason = [rejection_reason, rejection_notes]
        .filter(Boolean)
        .join(": ");
    }

    // Use transaction-like behavior with optimistic locking
    const { data: updatedQuote, error: updateError } = await supabase
      .from("quotes")
      .update(updateData)
      .eq("id", quote.id)
      .eq("lifecycle_status", "quoted") // Ensure status hasn't changed
      .select()
      .single();

    if (updateError || !updatedQuote) {
      // Could be race condition - quote status changed
      console.error("Failed to update quote:", updateError);

      // Check current state
      const { data: currentQuote } = await supabase
        .from("quotes")
        .select("lifecycle_status")
        .eq("id", quote.id)
        .single();

      if (currentQuote?.lifecycle_status === "accepted") {
        return NextResponse.json({
          success: true,
          message: "Quote has already been accepted",
          confirmationNumber: quote.reference_number,
        });
      }

      return NextResponse.json(
        { error: "Quote is no longer available for this action" },
        { status: 409 }
      );
    }

    // Mark token as used
    await markTokenUsed(tokenRecord.id);

    // Create audit log entry
    await supabase.from("quote_audit_log").insert({
      quote_id: quote.id,
      action: action === "accept" ? "customer_accepted" : "customer_rejected",
      old_status: "quoted" as QuoteStatus,
      new_status: newStatus,
      actor_type: "customer",
      ip_address: ip,
      metadata: {
        signature: action === "accept" ? signature?.trim() : null,
        rejection_reason: action === "reject" ? rejection_reason : null,
        rejection_notes: action === "reject" ? rejection_notes : null,
        token_id: tokenRecord.id,
      },
    });

    // TODO: Send notification emails (Phase 4)
    // - If accepted: send confirmation email to customer, notify team
    // - If rejected: send confirmation email to customer, notify team

    return NextResponse.json({
      success: true,
      message:
        action === "accept"
          ? "Quote accepted successfully"
          : "Quote declined successfully",
      confirmationNumber: action === "accept" ? quote.reference_number : undefined,
      quote: {
        id: updatedQuote.id,
        reference_number: updatedQuote.reference_number,
        status: updatedQuote.lifecycle_status,
      },
    });
  } catch (error) {
    console.error("Error processing quote action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
