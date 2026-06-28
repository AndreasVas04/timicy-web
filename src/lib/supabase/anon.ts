import "server-only";

/**
 * Server-only Supabase client using the anon (public) key.
 *
 * Used for read-only access to public data: products, store_products,
 * price_history, category_map.  Respects Row Level Security policies.
 *
 * This module can only be imported in Server Components and Route Handlers —
 * the "server-only" import will cause a build error if a Client Component
 * tries to import it.
 */

import { createClient } from "@supabase/supabase-js";

export function createAnonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY. " +
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
