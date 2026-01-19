import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import { addUserToOrganization, getUserOrgMembership, grantSuperAdmin } from "@/lib/auth";
import type { OrgRole } from "@/types/database";

const supabase = createUntypedAdminClient();

// POST: Accept invitation
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Must be signed in" }, { status: 401 });
    }

    const { token } = await params;

    // Get invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Validate invitation status
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Invitation is ${invitation.status}` },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Validate email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: "Email mismatch",
          details: `This invitation was sent to ${invitation.email}. Please sign in with that email address.`,
          invitedEmail: invitation.email,
        },
        { status: 403 }
      );
    }

    // Check if this is a platform admin invitation
    const isPlatformInvite = !!invitation.platform_role;

    if (isPlatformInvite) {
      // Handle platform admin invitation
      if (invitation.platform_role === "super_admin") {
        const success = await grantSuperAdmin(user.id);
        if (!success) {
          return NextResponse.json({ error: "Failed to grant admin access" }, { status: 500 });
        }
      }

      // Mark invitation as accepted
      await supabase
        .from("invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);

      return NextResponse.json({
        success: true,
        redirect: "/admin",
        isPlatformAdmin: true,
      });
    }

    // Handle organization invitation
    // Check if user already in an org
    const existingMembership = await getUserOrgMembership(user.id);
    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member of an organization" },
        { status: 400 }
      );
    }

    // Add user to organization
    const member = await addUserToOrganization({
      userId: user.id,
      email: user.email || invitation.email,
      organizationId: invitation.organization_id,
      role: invitation.role as OrgRole,
      invitationId: invitation.id,
    });

    if (!member) {
      return NextResponse.json({ error: "Failed to join organization" }, { status: 500 });
    }

    // Mark invitation as accepted
    await supabase
      .from("invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    return NextResponse.json({
      success: true,
      redirect: "/dashboard",
    });
  } catch (error) {
    console.error("Error in POST /api/invitations/[token]/accept:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
