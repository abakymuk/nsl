import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/quotes/tokens";
import { logQuoteActivity, QuoteActivityType } from "@/lib/notifications";

/**
 * POST /api/quote/activity
 *
 * Log customer activity on a quote (page views, form interactions)
 * Public endpoint - authenticated via token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, activity_type } = body as {
      token: string;
      activity_type: QuoteActivityType;
    };

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const validActivities: QuoteActivityType[] = [
      "accept_page_viewed",
      "acceptance_started",
    ];

    if (!activity_type || !validActivities.includes(activity_type)) {
      return NextResponse.json(
        { error: "Invalid activity type" },
        { status: 400 }
      );
    }

    // Validate token (accept tokens for accept page activities)
    const result = await validateToken(token, "accept");
    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    const { quote } = result;

    // Get client info
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : null;
    const userAgent = request.headers.get("user-agent");

    // Log the activity
    const logResult = await logQuoteActivity(quote.id, activity_type, {
      ipAddress,
      userAgent,
    });

    if (!logResult.success) {
      return NextResponse.json(
        { error: "Failed to log activity" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging quote activity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
