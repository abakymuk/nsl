import { createClient } from "@supabase/supabase-js";

// Server-only storage for quote submissions; no browser auth or public DB client.
export function createUntypedAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing quote storage configuration");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
