import { NextRequest, NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * Product search Route Handler.
 *
 * Accepts a GET request with a `q` query parameter, calls the
 * `search_products` Postgres RPC via the anon Supabase client,
 * and returns matching products as JSON.
 *
 * Uses the anon key only — no service role key is exposed here.
 */

/**
 * This endpoint must never be statically cached because the response
 * depends entirely on the user's search query at request time.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  // Minimum 2 characters required — trigram/ILIKE-based search is not
  // meaningful below that length and would return too many irrelevant results.
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc("search_products", {
    q,
    max_results: 8,
  });

  if (error) {
    // Log server-side for debugging; return empty results so the
    // autocomplete degrades gracefully instead of throwing.
    console.error("[search] RPC error:", error.message);
    return NextResponse.json({ results: [] });
  }

  return NextResponse.json({ results: data ?? [] });
}
