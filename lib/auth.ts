import { createUntypedAdminClient, getUser } from "@/lib/supabase/server";
import type {
  Profile,
  Organization,
  OrganizationMember,
  PlatformRole,
  OrgRole,
} from "@/types/database";

// Use untyped client for auth operations since the new tables
// (profiles, organizations, organization_members) may not be in the
// auto-generated types yet
const createAdminClient = createUntypedAdminClient;

// =====================================================
// Types
// =====================================================

export interface UserPermissions {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  organization: Organization | null;
  orgRole: OrgRole | null;
  profile: Profile | null;
}

export interface OrgMembership {
  organization: Organization;
  role: OrgRole;
  member: OrganizationMember;
}

// =====================================================
// Profile Functions
// =====================================================

/**
 * Get user profile by ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

/**
 * Get profile by email
 */
export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: { full_name?: string; avatar_url?: string }
): Promise<Profile | null> {
  const supabase = createAdminClient();
  const updatePayload: { full_name?: string; avatar_url?: string; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
  if (updates.avatar_url !== undefined) updatePayload.avatar_url = updates.avatar_url;

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    return null;
  }

  return data;
}

// =====================================================
// Super Admin Functions
// =====================================================

/**
 * Check if a user is a platform super admin
 * If no userId provided, checks the current authenticated user
 */
export async function isSuperAdmin(userId?: string): Promise<boolean> {
  let uid = userId;

  if (!uid) {
    const user = await getUser();
    if (!user) return false;
    uid = user.id;
  }

  const profile = await getProfile(uid);
  return profile?.role === "super_admin";
}

/**
 * Grant super admin role to a user
 */
export async function grantSuperAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: "super_admin" as PlatformRole, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("Error granting super admin:", error);
    return false;
  }

  return true;
}

/**
 * Revoke super admin role from a user
 */
export async function revokeSuperAdmin(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: "user" as PlatformRole, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    console.error("Error revoking super admin:", error);
    return false;
  }

  return true;
}

/**
 * Check and auto-promote initial super admin from env variable
 * Called on sign-in to auto-promote the first admin
 */
export async function checkInitialSuperAdmin(email: string): Promise<void> {
  const initialAdminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL;

  if (!initialAdminEmail || email.toLowerCase() !== initialAdminEmail.toLowerCase()) {
    return;
  }

  const profile = await getProfileByEmail(email);
  if (!profile) return;

  // Already super admin
  if (profile.role === "super_admin") return;

  // Promote to super admin
  await grantSuperAdmin(profile.id);
  console.log(`Auto-promoted ${email} to super_admin via INITIAL_SUPER_ADMIN_EMAIL`);
}

// =====================================================
// Organization Membership Functions
// =====================================================

/**
 * Get user's organization membership
 */
export async function getUserOrgMembership(
  userId: string
): Promise<OrgMembership | null> {
  const supabase = createAdminClient();

  const { data: member, error } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", userId)
    .single();

  if (error || !member) {
    return null;
  }

  // Type assertion for the joined data
  const org = member.organizations as unknown as Organization;

  return {
    organization: org,
    role: member.role as OrgRole,
    member: member as OrganizationMember,
  };
}

/**
 * Check if user is an admin of a specific organization
 */
export async function isOrgAdmin(
  userId: string,
  orgId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.role === "admin";
}

/**
 * Check if user is a member of a specific organization (any role)
 */
export async function isOrgMember(
  userId: string,
  orgId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .single();

  return !error && !!data;
}

/**
 * Get full user permissions (combines all checks)
 */
export async function getUserPermissions(
  userId?: string
): Promise<UserPermissions | null> {
  let uid = userId;
  let userEmail = "";

  if (!uid) {
    const user = await getUser();
    if (!user) return null;
    uid = user.id;
    userEmail = user.email || "";
  }

  const profile = await getProfile(uid);
  if (!profile) {
    return {
      userId: uid,
      email: userEmail,
      isSuperAdmin: false,
      organization: null,
      orgRole: null,
      profile: null,
    };
  }

  const membership = await getUserOrgMembership(uid);

  return {
    userId: uid,
    email: profile.email,
    isSuperAdmin: profile.role === "super_admin",
    organization: membership?.organization || null,
    orgRole: membership?.role || null,
    profile,
  };
}

// =====================================================
// Organization Functions
// =====================================================

/**
 * Find organization by email domain
 */
export async function findOrgByEmailDomain(
  email: string
): Promise<Organization | null> {
  const domain = "@" + email.split("@")[1];
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("email_domain", domain)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Create a new organization with the user as admin
 */
export async function createOrganization(params: {
  name: string;
  userId: string;
  email: string;
  setEmailDomain?: boolean;
}): Promise<{ organization: Organization; member: OrganizationMember } | null> {
  const { name, userId, email, setEmailDomain = true } = params;
  const supabase = createAdminClient();

  // Wait for profile to be created by trigger (with retries)
  let profileExists = false;
  console.log("Waiting for profile to be created for user:", userId);
  for (let i = 0; i < 10; i++) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    console.log(`Profile check attempt ${i + 1}:`, { profile, error: profileError?.message });

    if (profile) {
      profileExists = true;
      console.log("Profile found on attempt", i + 1);
      break;
    }
    // Wait 300ms before retrying
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (!profileExists) {
    console.error("Profile not found after retries for user:", userId);
    // Create profile manually as fallback
    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      email,
    });
    console.log("Manual profile creation result:", insertError?.message || "success");
  }

  // Create slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // Extract domain if setting
  const domain = setEmailDomain ? "@" + email.split("@")[1] : null;

  // Create organization
  console.log("Creating organization with:", { name, slug, domain, email });
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      email_domain: domain,
      primary_email: email,
    })
    .select()
    .single();

  if (orgError || !org) {
    console.error("Error creating organization:", orgError);
    return null;
  }
  console.log("Organization created:", org.id);

  // Add user as admin
  console.log("Adding user as admin:", { orgId: org.id, userId, email });
  const { data: member, error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: userId,
      email,
      role: "admin" as OrgRole,
    })
    .select()
    .single();

  if (memberError || !member) {
    console.error("Error adding org member:", memberError);
    // Rollback org creation
    await supabase.from("organizations").delete().eq("id", org.id);
    return null;
  }
  console.log("Member added successfully:", member.id);

  return { organization: org, member };
}

/**
 * Add a user to an organization
 */
export async function addUserToOrganization(params: {
  userId: string;
  email: string;
  organizationId: string;
  role?: OrgRole;
  invitationId?: string;
}): Promise<OrganizationMember | null> {
  const { userId, email, organizationId, role = "member", invitationId } = params;
  const supabase = createAdminClient();

  // Wait for profile to be created by trigger (with retries)
  let profileExists = false;
  for (let i = 0; i < 5; i++) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (profile) {
      profileExists = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (!profileExists) {
    console.error("Profile not found after retries for user:", userId);
    await supabase.from("profiles").insert({
      id: userId,
      email,
    });
  }

  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      email,
      role,
      invitation_id: invitationId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding user to organization:", error);
    return null;
  }

  return data;
}

// =====================================================
// Routing Helpers
// =====================================================

/**
 * Determine where to redirect user after login
 */
export async function getPostLoginRedirect(userId: string): Promise<string> {
  const permissions = await getUserPermissions(userId);

  if (!permissions) {
    return "/sign-in";
  }

  // Super admins go to admin panel
  if (permissions.isSuperAdmin) {
    return "/admin";
  }

  // Users with org go to dashboard
  if (permissions.organization) {
    return "/dashboard";
  }

  // Users without org need to set one up
  return "/onboarding";
}
