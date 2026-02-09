import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  findOrgByEmailDomain,
  addUserToOrganization,
  createOrganization,
} from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Personal email domains that are not allowed
const BLOCKED_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "mail.com",
  "yandex.com",
  "zoho.com",
  "gmx.com",
  "gmx.net",
];

function isWorkEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return !BLOCKED_EMAIL_DOMAINS.includes(domain);
}

// Lazy initialization to avoid module-scope env var access during build
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: NextRequest) {
  // Rate limit signup requests
  const rateLimit = await checkRateLimit(request, "signup");
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.reset);
  }

  const supabase = getSupabase();
  try {
    const body = await request.json();
    const {
      email,
      password,
      fullName,
      orgAction, // 'create' | 'join' | 'skip'
      orgName, // For creating new org
      orgId, // For joining existing org
      invitationToken, // For accepting invitation
    } = body;

    console.log("Signup request:", { email, fullName, orgAction, orgName, orgId });

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate work email
    if (!isWorkEmail(email)) {
      return NextResponse.json(
        { error: "Please use your work email address. Personal email addresses (Gmail, Yahoo, etc.) are not allowed." },
        { status: 400 }
      );
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: process.env.NODE_ENV !== "production",
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) {
      console.error("Error creating user:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    // Handle organization based on action
    let organizationId: string | null = null;
    let organizationName: string | null = null;

    if (orgAction === "create" && orgName) {
      console.log("Creating organization:", orgName, "for user:", userId);
      // Create new organization with user as admin
      const result = await createOrganization({
        name: orgName,
        userId,
        email,
        setEmailDomain: true,
      });

      console.log("Create organization result:", result);

      if (result) {
        organizationId = result.organization.id;
        organizationName = result.organization.name;
        console.log("Organization created successfully:", organizationId);
      } else {
        console.error("Failed to create organization for user:", userId);
        // Don't fail the signup, but log the error
        // User can set up org later from dashboard
      }
    } else if (orgAction === "join" && orgId) {
      // Join existing organization (by domain match or invitation)
      const result = await addUserToOrganization({
        userId,
        email,
        organizationId: orgId,
        role: "member",
        invitationId: invitationToken,
      });

      if (result) {
        organizationId = orgId;
        // Fetch org name
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", orgId)
          .single();
        organizationName = org?.name || null;
      }
    }

    // If invitation token provided, mark it as accepted
    if (invitationToken) {
      await supabase
        .from("invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("token", invitationToken);
    }

    return NextResponse.json({
      success: true,
      userId,
      organizationId,
      organizationName,
      redirect: "/dashboard",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Check for pending invitations or domain match
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate work email
    if (!isWorkEmail(email)) {
      return NextResponse.json(
        { error: "Please use your work email address. Personal email addresses are not allowed." },
        { status: 400 }
      );
    }

    // Check for pending invitation
    const { data: invitation } = await supabase
      .from("invitations")
      .select("*, organizations(id, name)")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invitation) {
      const org = invitation.organizations as { id: string; name: string } | null;
      return NextResponse.json({
        hasInvitation: true,
        invitation: {
          id: invitation.id,
          token: invitation.token,
          role: invitation.role,
          inviterName: invitation.inviter_name,
          organizationId: org?.id,
          organizationName: org?.name,
        },
      });
    }

    // Check for domain match
    const domainOrg = await findOrgByEmailDomain(email);

    if (domainOrg) {
      return NextResponse.json({
        hasDomainMatch: true,
        organization: {
          id: domainOrg.id,
          name: domainOrg.name,
        },
      });
    }

    return NextResponse.json({
      hasInvitation: false,
      hasDomainMatch: false,
    });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
