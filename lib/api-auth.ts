import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { isSuperAdmin, getUserOrgMembership, isOrgAdmin, isOrgMember } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

// =====================================================
// Error Response Helpers
// =====================================================

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// =====================================================
// Auth Guards for API Routes
// =====================================================

/**
 * Require authenticated user
 * Returns user or throws error response
 */
export async function requireAuth(): Promise<User> {
  const user = await getUser();
  if (!user) {
    throw unauthorizedResponse("You must be signed in");
  }
  return user;
}

/**
 * Require super admin access
 * Returns user or throws error response
 */
export async function requireSuperAdmin(): Promise<User> {
  const user = await requireAuth();
  const superAdmin = await isSuperAdmin(user.id);
  if (!superAdmin) {
    throw forbiddenResponse("Super admin access required");
  }
  return user;
}

/**
 * Require org admin access for specific org
 * Returns user or throws error response
 */
export async function requireOrgAdmin(orgId: string): Promise<User> {
  const user = await requireAuth();

  // Super admins can access any org
  const superAdmin = await isSuperAdmin(user.id);
  if (superAdmin) {
    return user;
  }

  const admin = await isOrgAdmin(user.id, orgId);
  if (!admin) {
    throw forbiddenResponse("Organization admin access required");
  }
  return user;
}

/**
 * Require org member access for specific org (any role)
 * Returns user or throws error response
 */
export async function requireOrgMember(orgId: string): Promise<User> {
  const user = await requireAuth();

  // Super admins can access any org
  const superAdmin = await isSuperAdmin(user.id);
  if (superAdmin) {
    return user;
  }

  const member = await isOrgMember(user.id, orgId);
  if (!member) {
    throw forbiddenResponse("Organization membership required");
  }
  return user;
}

/**
 * Require user to be part of any organization
 * Returns user and org membership or throws error response
 */
export async function requireAnyOrgMember(): Promise<{
  user: User;
  orgId: string;
  role: string;
}> {
  const user = await requireAuth();
  const membership = await getUserOrgMembership(user.id);

  if (!membership) {
    throw forbiddenResponse("You must be part of an organization");
  }

  return {
    user,
    orgId: membership.organization.id,
    role: membership.role,
  };
}

/**
 * Require user to be admin of their own organization
 * Returns user and org membership or throws error response
 */
export async function requireOwnOrgAdmin(): Promise<{
  user: User;
  orgId: string;
}> {
  const user = await requireAuth();

  // Super admins bypass this check
  const superAdmin = await isSuperAdmin(user.id);
  if (superAdmin) {
    const membership = await getUserOrgMembership(user.id);
    return {
      user,
      orgId: membership?.organization.id || "",
    };
  }

  const membership = await getUserOrgMembership(user.id);

  if (!membership) {
    throw forbiddenResponse("You must be part of an organization");
  }

  if (membership.role !== "admin") {
    throw forbiddenResponse("Organization admin access required");
  }

  return {
    user,
    orgId: membership.organization.id,
  };
}

// =====================================================
// Utility: Safe Guard Wrapper
// =====================================================

/**
 * Wraps an API handler with auth guard error handling
 * Catches thrown NextResponse errors and returns them properly
 */
export function withAuth<T>(
  handler: (user: User) => Promise<NextResponse<T>>
): () => Promise<NextResponse<T | { error: string }>> {
  return async () => {
    try {
      const user = await requireAuth();
      return handler(user);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      console.error("Auth handler error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Wraps an API handler with super admin guard
 */
export function withSuperAdmin<T>(
  handler: (user: User) => Promise<NextResponse<T>>
): () => Promise<NextResponse<T | { error: string }>> {
  return async () => {
    try {
      const user = await requireSuperAdmin();
      return handler(user);
    } catch (error) {
      if (error instanceof NextResponse) {
        return error;
      }
      console.error("Super admin handler error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
