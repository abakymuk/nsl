import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/server";

const supabase = createUntypedAdminClient();

// GET: Get invitation details by token (public endpoint for viewing invite)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const { data: invitation, error } = await supabase
      .from("invitations")
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        inviter_name,
        organization_id,
        platform_role,
        organizations (
          id,
          name
        )
      `)
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Check if expired
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired && invitation.status === "pending") {
      // Mark as expired
      await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      invitation.status = "expired";
    }

    // Extract organization from joined data (may be array or object depending on query)
    const orgData = invitation.organizations;
    const org = Array.isArray(orgData) ? orgData[0] : orgData;

    // Check if this is a platform admin invitation
    const isPlatformInvite = !!invitation.platform_role;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        inviterName: invitation.inviter_name,
        organizationId: org?.id,
        organizationName: org?.name,
        expiresAt: invitation.expires_at,
        // Platform admin invitation fields
        platformRole: invitation.platform_role,
        isPlatformInvite,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/invitations/[token]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
