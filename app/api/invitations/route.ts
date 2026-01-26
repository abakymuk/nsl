import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { getUserOrgMembership, isOrgAdmin, getProfile } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import type { OrgRole } from "@/types/database";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: ReturnType<typeof createUntypedAdminClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createUntypedAdminClient();
  }
  return _supabase;
}

// GET: List invitations for user's organization
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getUserOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Only org admins can view invitations
    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data, error } = await getSupabase()
      .from("invitations")
      .select("*")
      .eq("organization_id", membership.organization.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitations:", error);
      return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
    }

    return NextResponse.json({ invitations: data });
  } catch (error) {
    console.error("Error in GET /api/invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create invitation
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getUserOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Only org admins can invite
    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = "member" } = body as { email: string; role?: OrgRole };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if email already a member
    const { data: existingMember } = await getSupabase()
      .from("organization_members")
      .select("id")
      .eq("organization_id", membership.organization.id)
      .eq("email", email.toLowerCase())
      .single();

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 400 });
    }

    // Check if pending invitation exists
    const { data: existingInvite } = await getSupabase()
      .from("invitations")
      .select("id")
      .eq("organization_id", membership.organization.id)
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "Pending invitation already exists" }, { status: 400 });
    }

    // Get inviter profile for name
    const inviterProfile = await getProfile(user.id);
    const inviterName = inviterProfile?.full_name || user.email;

    // Create invitation
    const { data: invitation, error: insertError } = await getSupabase()
      .from("invitations")
      .insert({
        organization_id: membership.organization.id,
        email: email.toLowerCase(),
        role,
        invited_by: user.id,
        inviter_name: inviterName,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (insertError || !invitation) {
      console.error("Error creating invitation:", insertError);
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }

    // Send invitation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com";
    const inviteUrl = `${siteUrl}/invite/${invitation.token}`;

    try {
      await getResend().emails.send({
        from: process.env.EMAIL_FROM || "noreply@newstreamlogistics.com",
        to: email.toLowerCase(),
        subject: `You're invited to join ${membership.organization.name} on New Stream Logistics`,
        text: `
Hello,

${inviterName} has invited you to join ${membership.organization.name} on New Stream Logistics as a ${role}.

Click the link below to accept the invitation:
${inviteUrl}

This invitation expires in 7 days.

If you weren't expecting this invitation, you can ignore this email.

Best regards,
New Stream Logistics Team
        `.trim(),
      });
      console.log(`Invitation email sent to ${email}`);
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the request, invitation is still created
    }

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error("Error in POST /api/invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Revoke invitation
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await getUserOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
    }

    // Verify invitation belongs to user's org
    const { data: invitation } = await getSupabase()
      .from("invitations")
      .select("id, organization_id")
      .eq("id", invitationId)
      .single();

    if (!invitation || invitation.organization_id !== membership.organization.id) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Update status to revoked
    const { error: updateError } = await getSupabase()
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", invitationId);

    if (updateError) {
      console.error("Error revoking invitation:", updateError);
      return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
