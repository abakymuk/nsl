import { NextRequest, NextResponse } from "next/server";
import { deliverQuoteNotifications } from "@/lib/quotes/outbox";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await deliverQuoteNotifications());
  } catch (error) {
    console.error("Quote notification retry failed", error);
    return NextResponse.json({ error: "Retry failed" }, { status: 503 });
  }
}
