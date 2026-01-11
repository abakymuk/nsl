// Admin email addresses - users with these emails get admin access
export const ADMIN_EMAILS = [
  "vlad@newstreamlogistics.com",
];

// Check if an email is an admin
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}
