import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";

// Share one limit across server instances using the existing database, not Redis.
export async function checkRateLimit(request: NextRequest) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing quote storage configuration");
  const address = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  const identifier = createHmac("sha256", secret).update(address).digest("hex");
  const { data, error } = await createUntypedAdminClient().rpc("check_quote_rate_limit", { p_identifier: identifier });
  if (error) throw error;
  return data === true;
}

export function rateLimitResponse() {
  return NextResponse.json({ error: "Too many requests. Please try again later." }, {
    status: 429, headers: { "Retry-After": "60" },
  });
}
