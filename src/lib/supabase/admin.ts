import "server-only";

/**
 * Server-only Supabase client using the service role key.
 *
 * This client bypasses Row Level Security entirely.  It must ONLY be used
 * inside Route Handlers that need privileged access (e.g. price-alert
 * subscriptions, admin endpoints).  Never use this client in page-level
 * server components for regular data reads — use createAnonClient() instead.
 */

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Copy .env.example to .env.local and fill in the values."
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
