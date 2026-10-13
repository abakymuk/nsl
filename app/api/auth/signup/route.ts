import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createUntypedAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { registrationSchema, completeRegistration } from "@/lib/registration";

export async function POST(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, "signup");
  if (!rateLimit.success) return rateLimitResponse(rateLimit.reset);
  try {
    const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const body = parsed.data;
    if (body.orgAction === "join") {
      const { data: invitation, error } = await createUntypedAdminClient()
        .from("invitations").select("email, organization_id, status, expires_at")
        .eq("token", body.invitationToken!).maybeSingle();
      if (error) throw error;
      if (!invitation || invitation.status !== "pending" || new Date(invitation.expires_at) <= new Date()
        || invitation.email.toLowerCase() !== body.email
        || (body.orgId && invitation.organization_id !== body.orgId)) {
        return NextResponse.json({ error: "Invalid invitation" }, { status: 403 });
      }
    }
    const supabase = await createServerClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl && process.env.NODE_ENV === "production") throw new Error("Site URL is not configured");
    // Supabase sends confirmation and manages PKCE cookies. Membership is only
    // granted after the verified session is established in the auth callback.
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        emailRedirectTo: `${siteUrl || "http://localhost:3000"}/auth/callback`,
        data: { full_name: body.fullName, registration: {
          orgAction: body.orgAction, orgName: body.orgName, invitationToken: body.invitationToken,
        } },
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (data.session && data.user) await completeRegistration(supabase, data.user);
    return NextResponse.json({ success: true, verificationRequired: !data.session, redirect: "/dashboard" });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Unable to finish registration. Please try again." }, { status: 500 });
  }
}

// Do not disclose invitations, tokens or organization IDs for an unverified email.
export async function GET() {
  return NextResponse.json({ hasInvitation: false, hasDomainMatch: false });
}
