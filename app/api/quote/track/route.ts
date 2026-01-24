import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/quotes/tokens";
import { logQuoteActivity } from "@/lib/notifications";

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

/**
 * GET /api/quote/track
 *
 * Tracking pixel endpoint for email opens
 * Returns a 1x1 transparent GIF and logs the activity
 *
 * Query params:
 * - token: The quote status token
 * - event: The event type (email_opened)
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const event = request.nextUrl.searchParams.get("event");

  // Always return the GIF, even if tracking fails
  const gifResponse = () =>
    new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": TRANSPARENT_GIF.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

  // Validate params
  if (!token || event !== "email_opened") {
    return gifResponse();
  }

  try {
    // Validate token (status token for email tracking)
    const result = await validateToken(token, "status");
    if (!result) {
      return gifResponse();
    }

    const { quote } = result;

    // Get client info
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : null;
    const userAgent = request.headers.get("user-agent");

    // Log the email open activity
    await logQuoteActivity(quote.id, "email_opened", {
      ipAddress,
      userAgent,
      metadata: {
        tracking_method: "pixel",
      },
    });
  } catch (error) {
    // Log error but still return GIF
    console.error("Error tracking email open:", error);
  }

  return gifResponse();
}
