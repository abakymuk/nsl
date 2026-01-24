import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { isSuperAdmin, getProfile } from "@/lib/auth";
import { Resend } from "resend";

// Lazy initialization to avoid module-scope env var access during build
let _supabase: ReturnType<typeof createUntypedAdminClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createUntypedAdminClient();
  }
  return _supabase;
}

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(apiKey);
}

// GET: List platform admin invitations
export async function GET() {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await getSupabase()
      .from("invitations")
      .select("*")
      .not("platform_role", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admin invitations:", error);
      return NextResponse.json({ error: "Failed to fetch invitations" }, { status: 500 });
    }

    return NextResponse.json({ invitations: data || [] });
  } catch (error) {
    console.error("Error in GET /api/admin/invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create platform admin invitation
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isSuperAdmin(user.id))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already a super_admin
    const { data: existingAdmin } = await getSupabase()
      .from("profiles")
      .select("id, role")
      .eq("email", normalizedEmail)
      .single();

    if (existingAdmin?.role === "super_admin") {
      return NextResponse.json({ error: "User is already a super admin" }, { status: 400 });
    }

    // Check if pending platform invitation exists
    const { data: existingInvite } = await getSupabase()
      .from("invitations")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .not("platform_role", "is", null)
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
        email: normalizedEmail,
        platform_role: "super_admin",
        invited_by: user.id,
        inviter_name: inviterName,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (insertError || !invitation) {
      console.error("Error creating invitation:", insertError);
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }

    // Send invitation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://newstreamlogistics.com";
    const inviteUrl = `${siteUrl}/invite/${invitation.token}?admin=true`;

    try {
      const resend = getResend();
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "noreply@newstreamlogistics.com",
        to: normalizedEmail,
        subject: "You're invited as a Platform Admin - New Stream Logistics",
        text: `
Hello,

${inviterName} has invited you to join New Stream Logistics as a Platform Administrator.

As a platform admin, you'll have full access to manage loads, quotes, users, and system settings.

Click the link below to accept the invitation and create your account:
${inviteUrl}

This invitation expires in 7 days.

If you weren't expecting this invitation, you can ignore this email.

Best regards,
New Stream Logistics Team
        `.trim(),
      });
      console.log(`Admin invitation email sent to ${normalizedEmail}`);
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the request, invitation is still created
    }

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    console.error("Error in POST /api/admin/invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Revoke invitation
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isSuperAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json({ error: "Invitation ID required" }, { status: 400 });
    }

    // Verify it's a platform invitation
    const { data: invitation } = await getSupabase()
      .from("invitations")
      .select("id, platform_role")
      .eq("id", invitationId)
      .not("platform_role", "is", null)
      .single();

    if (!invitation) {
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
    console.error("Error in DELETE /api/admin/invitations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
