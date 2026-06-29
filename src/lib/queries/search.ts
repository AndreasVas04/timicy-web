import "server-only";

import { createAnonClient } from "@/lib/supabase/anon";

/**
 * Fetch paginated search results using the `search_products_paged` RPC.
 *
 * The RPC uses substring ILIKE + pg_trgm similarity matching and returns
 * results ranked by relevance. Each row includes a `total_count` field
 * (computed via a window function inside the RPC) that reflects the grand
 * total of ALL matches before limit/offset — we read it from the first
 * row so the frontend can compute total pages without a separate query.
 */
export async function getSearchResults({
  q,
  page = 1,
  pageSize = 24,
}: {
  q: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  rows: {
    id: number;
    canonical_title: string;
    brand: string;
    image_url: string | null;
    min_price: number;
    offer_count: number;
  }[];
  total: number;
}> {
  const supabase = createAnonClient();

  const offset = (page - 1) * pageSize;

  const { data, error } = await supabase.rpc("search_products_paged", {
    q,
    max_results: pageSize,
    result_offset: offset,
  });

  if (error) {
    console.error("[search] search_products_paged RPC error:", error.message);
    return { rows: [], total: 0 };
  }

  if (!data || data.length === 0) {
    return { rows: [], total: 0 };
  }

  // total_count is the same on every row (window function); read from first row.
  const total = Number(data[0].total_count) || 0;

  return { rows: data, total };
}
