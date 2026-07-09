import "server-only";

import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import {
  type FilterParams,
  buildSlugMap,
} from "@/lib/filter-params";

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

/** Shape returned by both the raw and cached category product queries. */
type CategoryProductResult = {
  rows: {
    id: number;
    canonical_title: string;
    brand: string | null;
    image_url: string | null;
    min_price: number | null;
    max_price: number | null;
    offer_count: number;
    store_count: number;
    has_available_offer: boolean;
  }[];
  total: number;
};

/**
 * Raw, uncached category product query — the single home of all category
 * listing query logic including optional filter application.
 *
 * This function is called directly when filters are active (filtered
 * requests are long-tail and would not benefit from caching), and
 * indirectly through the getCategoryProducts cached wrapper for the
 * unfiltered default path.
 *
 * IMPORTANT: Supabase/PostgREST returns at most 1000 rows per request by
 * default. Categories like headphones (2373 products) and speakers (1278)
 * exceed this limit. We MUST use `.range()` for pagination rather than
 * fetching all rows and slicing client-side.
 *
 * The `count: "exact"` option asks PostgREST to return the total matching
 * row count via the Content-Range header, which we need to compute the
 * total number of pages without a separate COUNT query.
 */
export async function queryCategoryProducts({
  category,
  sort = "popular" as CategorySort,
  page = 1,
  pageSize = 24,
  filters,
}: {
  category: string;
  sort?: CategorySort;
  page?: number;
  pageSize?: number;
  filters?: FilterParams;
}): Promise<CategoryProductResult> {
  const supabase = createAnonClient();

  // Compute the 0-based range for PostgREST pagination.
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      "id, canonical_title, brand, image_url, min_price, max_price, offer_count, store_count, has_available_offer",
      { count: "exact" }
    )
    .eq("category", category);

  // --- Availability baseline ---
  // By default, only products with at least one available offer are
  // shown. Fully-unavailable products are hidden because their prices
  // freeze at the last scraped value and can carry stale/wrong data.
  // The ?stock=all URL param reveals them for users who explicitly want
  // to see everything; product pages remain reachable via direct link
  // regardless of this filter.
  if (!filters || filters.stock === "in") {
    query = query.eq("has_available_offer", true);
  }

  // --- Brand filter ---
  // Resolve URL slugs to canonical database values via the category's
  // brand list. Slugs that don't resolve are silently dropped.
  if (filters && filters.brands.length > 0) {
    const allBrands = await getCategoryBrands(category);
    const slugMap = buildSlugMap(allBrands);
    const resolved = filters.brands
      .map((slug) => slugMap.get(slug))
      .filter((v): v is string => v != null);

    // Only apply the brand predicate if at least one slug resolved.
    // If none resolved, the filter is ignored (shows all brands).
    if (resolved.length > 0) {
      query = query.in("brand", resolved);
    }
  }

  // --- Price filter ---
  // V1 filters on min_price (the product's cheapest offer price). This
  // is honest on top of the availability default and will switch to a
  // writer-computed min_available_price column in a later step (single-
  // line change here).
  if (filters?.min != null) {
    query = query.gte("min_price", filters.min);
  }
  if (filters?.max != null) {
    query = query.lte("min_price", filters.max);
  }

  // Apply sort order based on the requested key.
  //
  // Every sort branch starts with has_available_offer DESC so that
  // products with at least one buyable offer appear first. This is
  // still required for the stock=all path (where unavailable products
  // are included) and is harmless on the default path (where all rows
  // already have has_available_offer = true).
  switch (sort) {
    case "price_asc":
      // Buyable first, then cheapest first; nulls go to the end.
      query = query
        .order("has_available_offer", { ascending: false })
        .order("min_price", {
          ascending: true,
          nullsFirst: false,
        });
      break;
    case "price_desc":
      // Buyable first, then most expensive first; nulls go to the end.
      query = query
        .order("has_available_offer", { ascending: false })
        .order("min_price", {
          ascending: false,
          nullsFirst: false,
        });
      break;
    case "popular":
    default:
      // Buyable first, then most offers (proxy for popularity),
      // then cheapest among ties.
      query = query
        .order("has_available_offer", { ascending: false })
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
}

/**
 * Cached category product fetch — for the UNFILTERED default path only.
 *
 * Wrapped in unstable_cache so category listings are served from the Data
 * Cache until the 'catalog' tag is revalidated (POST /api/revalidate).
 * The cache key is composed of keyParts + the serialized arguments object
 * (category, sort, page, pageSize are all strings/numbers — fully
 * serializable), so each combination gets its own cache entry.
 *
 * Filters are NOT passed to this wrapper — serialized filter objects
 * would explode the cache key space. Filtered requests go directly
 * through queryCategoryProducts instead.
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
  }): Promise<CategoryProductResult> => {
    // Delegate to the raw query function with no filters.
    return queryCategoryProducts({ category, sort, page, pageSize });
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

/**
 * Fetch all distinct brand values for a given category, ordered by
 * popularity (product count descending, alphabetical tie-break).
 *
 * Used to build the slug-to-canonical map for brand filter resolution
 * and to populate the brand checkbox list in the filter panel. The
 * product count serves as the popularity proxy (same spirit as the
 * offer_count popular sort on the product grid), so the first brands
 * shown before the show-more expander are the ones users most likely
 * want to filter by.
 *
 * Only brands that have at least one product with has_available_offer = true
 * are included. This prevents the filter panel from showing brands whose
 * products are all unavailable, which would produce an empty result page
 * under the default stock=in listing. Accepted trade-off: when stock=all
 * is active, brands with only unavailable products will not have a
 * checkbox in the panel, though their ?brand= URLs still work correctly
 * if hand-typed.
 *
 * Since supabase-js has no DISTINCT operator and creating a database RPC
 * is out of scope, this fetches the brand column with pagination (PostgREST
 * caps at 1000 rows per request), counts occurrences per brand in
 * TypeScript, then sorts by count descending with an alphabetical
 * localeCompare tie-break for determinism.
 *
 * Cached per category (at most 21 entries) with the same "catalog" tag
 * so the nightly revalidation refreshes brand lists automatically.
 */
export const getCategoryBrands = unstable_cache(
  async (category: string): Promise<string[]> => {
    const supabase = createAnonClient();
    const allBrands: string[] = [];

    // Paginate through all products in the category, fetching only the
    // brand column. PostgREST caps at 1000 rows per request; the largest
    // category has ~2400 products, so this takes 2-3 requests.
    // Only products with at least one available offer are included so
    // the brand list aligns with the default (stock=in) product listing.
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("products")
        .select("brand")
        .eq("category", category)
        .eq("has_available_offer", true)
        .not("brand", "is", null)
        .order("brand")
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error("Failed to fetch category brands:", error.message);
        break;
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        for (const row of data) {
          if (row.brand) allBrands.push(row.brand);
        }
        // If we got fewer rows than the batch size, we've reached the end.
        hasMore = data.length === batchSize;
        offset += batchSize;
      }
    }

    // Count how many listed products each brand has. This product count
    // is the popularity proxy: brands with more products appear first in
    // the filter panel, before the show-more expander.
    const countByBrand = new Map<string, number>();
    for (const brand of allBrands) {
      countByBrand.set(brand, (countByBrand.get(brand) ?? 0) + 1);
    }

    // Sort by product count descending; ties broken alphabetically via
    // localeCompare for deterministic, locale-aware ordering.
    const unique = [...countByBrand.keys()].sort((a, b) => {
      const diff = (countByBrand.get(b) ?? 0) - (countByBrand.get(a) ?? 0);
      return diff !== 0 ? diff : a.localeCompare(b);
    });

    return unique;
  },
  ["getCategoryBrands"],
  {
    tags: ["catalog"],
    revalidate: 3600,
  }
);
