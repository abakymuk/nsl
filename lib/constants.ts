// =====================================================
// DEPRECATED: Admin email checks
// =====================================================
// These are kept for backwards compatibility during migration.
// Use isSuperAdmin() from @/lib/auth instead for new code.
// The database-driven approach uses profiles.role field.

/**
 * @deprecated Use isSuperAdmin() from @/lib/auth instead
 */
export const ADMIN_EMAILS: string[] = [];

/**
 * @deprecated Use isSuperAdmin() from @/lib/auth instead
 * This now always returns false - admin checks are done via database
 */
export function isAdminEmail(_email: string | null | undefined): boolean {
  // Admin checks are now done via the database (profiles.role = 'super_admin')
  // See lib/auth.ts isSuperAdmin() for the new implementation
  return false;
}
