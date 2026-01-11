import { createUntypedAdminClient } from "@/lib/supabase/server";

const supabase = createUntypedAdminClient();

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  email_domain: string | null;
  primary_email: string | null;
  phone: string | null;
  address: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  role: "admin" | "member";
}

/**
 * Get user's organization by their Supabase user ID
 */
export async function getUserOrganization(userId: string): Promise<Organization | null> {
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .single();

  if (!member) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", member.organization_id)
    .single();

  return org;
}

/**
 * Get user's organization by their email
 * First checks membership, then tries email domain matching
 */
export async function getOrganizationByEmail(email: string): Promise<Organization | null> {
  // First, check if user is already a member
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("email", email)
    .single();

  if (member) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", member.organization_id)
      .single();
    return org;
  }

  // Try domain matching
  const domain = "@" + email.split("@")[1];
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("email_domain", domain)
    .single();

  return org;
}

/**
 * Create an organization and add the user as admin
 */
export async function createOrganization(
  name: string,
  userId: string,
  email: string,
  phone?: string
): Promise<Organization | null> {
  // Create slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const domain = "@" + email.split("@")[1];

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      email_domain: domain,
      primary_email: email,
      phone,
    })
    .select()
    .single();

  if (orgError || !org) {
    console.error("Error creating organization:", orgError);
    return null;
  }

  // Add user as admin
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: userId,
      email,
      role: "admin",
    });

  if (memberError) {
    console.error("Error adding member:", memberError);
    // Rollback org creation
    await supabase.from("organizations").delete().eq("id", org.id);
    return null;
  }

  return org;
}

/**
 * Add a member to an organization
 */
export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  email: string,
  role: "admin" | "member" = "member"
): Promise<boolean> {
  const { error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      email,
      role,
    });

  if (error) {
    console.error("Error adding member:", error);
    return false;
  }

  return true;
}

/**
 * Get quotes for an organization
 */
export async function getOrganizationQuotes(organizationId: string, status?: string) {
  let query = supabase
    .from("quotes")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching org quotes:", error);
    return [];
  }
  return data || [];
}

/**
 * Get shipments for an organization
 */
export async function getOrganizationShipments(organizationId: string, status?: string) {
  let query = supabase
    .from("shipments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching org shipments:", error);
    return [];
  }
  return data || [];
}

/**
 * Get organization stats
 */
export async function getOrganizationStats(organizationId: string) {
  const [
    { count: totalQuotes },
    { count: pendingQuotes },
    { count: activeShipments },
    { count: completedShipments },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("quotes")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    supabase
      .from("shipments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["booked", "in_transit", "at_port", "out_for_delivery"]),
    supabase
      .from("shipments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "delivered"),
  ]);

  return {
    totalQuotes: totalQuotes || 0,
    pendingQuotes: pendingQuotes || 0,
    activeShipments: activeShipments || 0,
    completedShipments: completedShipments || 0,
  };
}
