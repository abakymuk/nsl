import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/quotes/tokens";
import { QuoteTokenType } from "@/types/database";

/**
 * GET /api/quote/validate
 *
 * Validate a quote token and return the associated quote
 * This is a public endpoint - no auth required
 *
 * Query params:
 * - token: The token string
 * - type: Token type ('status' or 'accept')
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    const type = request.nextUrl.searchParams.get("type") as QuoteTokenType;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    if (!type || !["status", "accept"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'status' or 'accept'" },
        { status: 400 }
      );
    }

    // Validate token - this returns null for invalid/expired tokens
    const result = await validateToken(token, type);

    if (!result) {
      // Return generic "not found" to prevent token enumeration
      return NextResponse.json(
        { error: "Quote not found" },
        { status: 404 }
      );
    }

    const { quote, tokenRecord } = result;

    // For accept tokens, also verify the quote is in a state that can be accepted
    if (type === "accept") {
      const status = quote.lifecycle_status || quote.status;
      if (status !== "quoted") {
        // Quote is not in a state that can be accepted
        // Could be already accepted, rejected, expired, etc.
        let message = "Quote is no longer available for acceptance";
        if (status === "accepted") {
          message = "Quote has already been accepted";
        } else if (status === "rejected") {
          message = "Quote has been declined";
        } else if (status === "expired") {
          message = "Quote has expired";
        }
        return NextResponse.json({ error: message }, { status: 400 });
      }

      // Check if quote itself has expired (separate from token expiry)
      if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "Quote has expired" },
          { status: 400 }
        );
      }
    }

    // Return sanitized quote data (no internal fields)
    const sanitizedQuote = {
      id: quote.id,
      reference_number: quote.reference_number,
      status: quote.status,
      lifecycle_status: quote.lifecycle_status,
      company_name: quote.company_name,
      contact_name: quote.contact_name,
      // Don't expose full email for privacy
      email: quote.email ? maskEmail(quote.email) : null,
      container_number: quote.container_number,
      container_size: quote.container_size,
      pickup_terminal: quote.pickup_terminal,
      delivery_zip: quote.delivery_zip,
      delivery_city: quote.delivery_city,
      delivery_state: quote.delivery_state,
      lfd: quote.lfd,
      quoted_price: quote.quoted_price,
      total_price: quote.total_price,
      pricing_breakdown: quote.pricing_breakdown,
      expires_at: quote.expires_at,
      quoted_at: quote.quoted_at,
      accepted_at: quote.accepted_at,
      rejected_at: quote.rejected_at,
      created_at: quote.created_at,
      first_response_at: quote.first_response_at,
    };

    return NextResponse.json({
      quote: sanitizedQuote,
      tokenExpires: tokenRecord.expires_at,
    });
  } catch (error) {
    console.error("Error validating token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Mask email for privacy (show first 2 chars and domain)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";

  const visibleChars = Math.min(2, local.length);
  const masked = local.substring(0, visibleChars) + "***";
  return `${masked}@${domain}`;
}
