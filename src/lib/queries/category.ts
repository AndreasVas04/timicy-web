import "server-only";

import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

/** Valid sort keys for category listings. */
export type CategorySort = "popular" | "price_asc" | "price_desc";

const VALID_SORTS: readonly CategorySort[] = [
  "popular",
  "price_asc",
  "price_desc",
];

/** Type guard for sort parameter validation. */
export function isValidSort(value: string): value is CategorySort {
  return VALID_SORTS.includes(value as CategorySort);
}

/**
 * Fetch a paginated, sorted list of products for a given category.
 *
 * IMPORTANT: Supabase/PostgREST returns at most 1000 rows per request by
 * default. Categories like headphones (2373 products) and speakers (1278)
 * exceed this limit. We MUST use `.range()` for pagination rather than
 * fetching all rows and slicing client-side.
 *
 * The `count: "exact"` option asks PostgREST to return the total matching
 * row count via the Content-Range header, which we need to compute the
 * total number of pages without a separate COUNT query.
 *
 * Wrapped in unstable_cache so category listings are served from the Data
 * Cache until the 'catalog' tag is revalidated (POST /api/revalidate).
 * The cache key is composed of keyParts + the serialized arguments object
 * (category, sort, page, pageSize are all strings/numbers → fully
 * serializable), so each combination gets its own cache entry.
 */
export const getCategoryProducts = unstable_cache(
  async ({
    category,
    sort = "popular" as CategorySort,
    page = 1,
    pageSize = 24,
  }: {
    category: string;
    sort?: CategorySort;
    page?: number;
    pageSize?: number;
  }): Promise<{
    rows: {
      id: number;
      canonical_title: string;
      brand: string | null;
      image_url: string | null;
      min_price: number | null;
      max_price: number | null;
      offer_count: number;
    }[];
    total: number;
  }> => {
    const supabase = createAnonClient();

    // Compute the 0-based range for PostgREST pagination.
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("products")
      .select(
        "id, canonical_title, brand, image_url, min_price, max_price, offer_count",
        { count: "exact" }
      )
      .eq("category", category);

    // Apply sort order based on the requested key.
    switch (sort) {
      case "price_asc":
        // Cheapest first; products with no price go to the end.
        query = query.order("min_price", {
          ascending: true,
          nullsFirst: false,
        });
        break;
      case "price_desc":
        // Most expensive first; products with no price go to the end.
        query = query.order("min_price", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      case "popular":
      default:
        // Most offers first (proxy for popularity), then cheapest among ties.
        query = query
          .order("offer_count", { ascending: false })
          .order("min_price", { ascending: true, nullsFirst: false });
        break;
    }

    // Paginate using .range() to stay within the PostgREST row limit.
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch category products:", error.message);
      return { rows: [], total: 0 };
    }

    return {
      rows: data ?? [],
      total: count ?? 0,
    };
  },
  ["getCategoryProducts"],
  {
    tags: ["catalog"],
    // revalidate: 3600 is the interim time backstop; raise to 86400 in
    // Step 11 when the webhook caller is connected, to match the
    // page-level revalidate.
    revalidate: 3600,
  }
);
