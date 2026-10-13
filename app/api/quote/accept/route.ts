import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUntypedAdminClient } from "@/lib/supabase/server";
import { logQuoteActivity } from "@/lib/notifications";

const responseSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i), action: z.enum(["accept", "reject"]),
  signature: z.string().trim().max(200).optional(),
  rejection_reason: z.string().trim().max(500).optional(),
  rejection_notes: z.string().trim().max(2000).optional(),
}).refine((v) => v.action === "accept" ? !!v.signature : !!v.rejection_reason,
  "Signature or rejection reason is required");

export async function POST(request: NextRequest) {
  try {
    const parsed = responseSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid response" }, { status: 400 });
    const body = parsed.data;
    const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim();
    const { data, error } = await createUntypedAdminClient().rpc("respond_to_quote", {
      p_token: body.token, p_action: body.action, p_signature: body.signature || null,
      p_reason: [body.rejection_reason, body.rejection_notes].filter(Boolean).join(": ") || null,
      p_ip: forwardedIp && isIP(forwardedIp) ? forwardedIp : null,
    });
    if (error) return NextResponse.json({ error: "Offer is unavailable. Please refresh and try again." }, { status: error.code === "22023" ? 409 : 503 });
    if (!data.duplicate) {
      try { await logQuoteActivity(data.id, body.action === "accept" ? "accepted" : "rejected", {
        ipAddress: forwardedIp && isIP(forwardedIp) ? forwardedIp : null,
        userAgent: request.headers.get("user-agent"),
        metadata: { signature: body.signature, reason: body.rejection_reason, notes: body.rejection_notes },
      }); }
      catch (error) { console.error("Quote activity notification failed", error); }
    }
    return NextResponse.json({ success: true, confirmationNumber: data.reference_number, quote: data });
  } catch (error) {
    console.error("Quote response failed", error);
    return NextResponse.json({ error: "Unable to process response" }, { status: 500 });
  }
}
