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

/* -------------------------------------------------------------------------- */
/*  Shared predicate helpers                                                   */
/*  Extracted from queryCategoryProducts so the same filtering logic can be    */
/*  reused by the lightweight filter-preview count query without duplicating   */
/*  predicate application.                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Resolve brand filter slugs to canonical database values.
 *
 * Fetches the cached brand list for the category, builds a slug lookup map,
 * and maps each slug in the filter to its canonical value. Slugs that don't
 * resolve are silently dropped (existing convention). Returns null when no
 * brand filter is present or when none of the requested slugs resolved.
 */
async function resolveBrandSlugs(
  category: string,
  filters?: FilterParams,
): Promise<string[] | null> {
  if (!filters || filters.brands.length === 0) return null;

  const allBrands = await getCategoryBrands(category);
  const slugMap = buildSlugMap(allBrands);
  const resolved = filters.brands
    .map((slug) => slugMap.get(slug))
    .filter((v): v is string => v != null);

  return resolved.length > 0 ? resolved : null;
}

/**
 * Apply the shared listing predicates to a Supabase query builder.
 *
 * Adds the category equality check, the availability baseline (in-stock
 * only unless stock==="all"), the brand inclusion filter (when resolved
 * slugs are present), and the min/max price range predicates. This is
 * pure predicate application with no sort, range, or select decisions,
 * so it can be shared between the full product query and the head-only
 * count query used by the filter preview.
 */
function applyListingPredicates(
  // Supabase query builder generics vary by select shape; a concrete
  // type would require duplicating this function for each call site.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  args: {
    category: string;
    filters?: FilterParams;
    resolvedBrands: string[] | null;
  },
) {
  query = query.eq("category", args.category);

  // Availability baseline: only show products with buyable offers unless
  // the user explicitly opted into seeing everything (stock=all).
  if (!args.filters || args.filters.stock === "in") {
    query = query.eq("has_available_offer", true);
  }

  // Brand filter: narrow to the resolved canonical brand names.
  if (args.resolvedBrands) {
    query = query.in("brand", args.resolvedBrands);
  }

  // Price range predicates on the product's cheapest-offer column.
  if (args.filters?.min != null) {
    query = query.gte("min_price", args.filters.min);
  }
  if (args.filters?.max != null) {
    query = query.lte("min_price", args.filters.max);
  }

  return query;
}

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

  // Resolve brand slugs once; the result feeds both the predicate
  // helper and is not needed again.
  const resolvedBrands = await resolveBrandSlugs(category, filters);

  // Build the base query with shared listing predicates (category,
  // availability, brands, price range).
  let query = applyListingPredicates(
    supabase
      .from("products")
      .select(
        "id, canonical_title, brand, image_url, min_price, max_price, offer_count, store_count, has_available_offer",
        { count: "exact" }
      ),
    { category, filters, resolvedBrands },
  );

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
 * Lightweight filter-preview query: returns the total matching product
 * count and optionally refreshed price bounds for a given filter state.
 *
 * Used exclusively by the interactive filter-preview server action so
 * the Apply button can show a live result count while the user adjusts
 * filters. The default (unfiltered) category path never calls this.
 *
 * Count query uses head:true (zero rows transferred, count-only via the
 * Content-Range header). Bounds reuse queryCategoryPriceBounds which
 * intentionally ignores price and stock filters (brands-only semantics)
 * so the slider always reflects the full available range for the
 * selected brands.
 *
 * Count and bounds run concurrently via Promise.all. On any query
 * error the function fails soft (returns count 0, bounds null),
 * matching the file's existing error-handling convention.
 */
export async function queryCategoryFilterPreview({
  category,
  filters,
  skipBounds,
}: {
  category: string;
  filters: FilterParams;
  skipBounds?: boolean;
}): Promise<{ count: number; bounds: PriceBounds | null }> {
  try {
    const resolvedBrands = await resolveBrandSlugs(category, filters);

    // Count-only query: select a minimal column with head:true so
    // PostgREST returns only the count header, zero rows over the wire.
    const countPromise = (async () => {
      const supabase = createAnonClient();
      const query = applyListingPredicates(
        supabase
          .from("products")
          .select("id", { count: "exact", head: true }),
        { category, filters, resolvedBrands },
      );
      const { count, error } = await query;
      if (error) {
        console.error("Filter preview count failed:", error.message);
        return 0;
      }
      return count ?? 0;
    })();

    // Bounds query: reuse the existing brands-only price bounds query.
    // Skipped when the caller knows brands haven't changed (the bounds
    // would be identical to the previous response).
    const boundsPromise = skipBounds
      ? Promise.resolve(null)
      : queryCategoryPriceBounds({ category, filters });

    const [count, bounds] = await Promise.all([countPromise, boundsPromise]);
    return { count, bounds };
  } catch (err) {
    console.error("Filter preview failed:", err);
    return { count: 0, bounds: null };
  }
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

/* -------------------------------------------------------------------------- */
/*  Price bounds                                                              */
/* -------------------------------------------------------------------------- */

/** Shape returned by the price-bounds queries. */
export type PriceBounds = { min: number | null; max: number | null };

/**
 * Raw, uncached query for the min and max price across a category's
 * available products. Optionally narrows by brand (resolved from
 * slugs the same way the product query does) but intentionally
 * ignores the price filter — the slider needs the full range.
 *
 * Two single-row queries are issued (ASC limit 1 + DESC limit 1)
 * instead of an aggregate function because PostgREST/supabase-js
 * doesn't expose SQL MIN/MAX and an RPC is out of scope.
 */
export async function queryCategoryPriceBounds({
  category,
  filters,
}: {
  category: string;
  filters?: FilterParams;
}): Promise<PriceBounds> {
  const supabase = createAnonClient();

  // Brand filter: resolve slugs → canonical names just like the
  // product query. Stock and price filters are intentionally omitted
  // so the slider shows the full available range.
  let resolvedBrands: string[] | null = null;
  if (filters && filters.brands.length > 0) {
    const allBrands = await getCategoryBrands(category);
    const slugMap = buildSlugMap(allBrands);
    const resolved = filters.brands
      .map((slug) => slugMap.get(slug))
      .filter((v): v is string => v != null);
    if (resolved.length > 0) resolvedBrands = resolved;
  }

  // Min price: ASC limit 1
  let minQ = supabase
    .from("products")
    .select("min_price")
    .eq("category", category)
    .eq("has_available_offer", true)
    .not("min_price", "is", null);
  if (resolvedBrands) minQ = minQ.in("brand", resolvedBrands);
  const { data: minData } = await minQ
    .order("min_price", { ascending: true })
    .limit(1);

  // Max price: DESC limit 1
  let maxQ = supabase
    .from("products")
    .select("min_price")
    .eq("category", category)
    .eq("has_available_offer", true)
    .not("min_price", "is", null);
  if (resolvedBrands) maxQ = maxQ.in("brand", resolvedBrands);
  const { data: maxData } = await maxQ
    .order("min_price", { ascending: false })
    .limit(1);

  const min =
    minData && minData.length > 0 && minData[0].min_price != null
      ? Number(minData[0].min_price)
      : null;
  const max =
    maxData && maxData.length > 0 && maxData[0].min_price != null
      ? Number(maxData[0].min_price)
      : null;

  return { min, max };
}

/**
 * Cached price-bounds fetch — for the UNFILTERED default path.
 *
 * Keyed on category only (at most 21 entries). Filtered requests
 * go through queryCategoryPriceBounds directly since brand
 * combinations would explode the cache key space.
 */
export const getCategoryPriceBounds = unstable_cache(
  async (category: string): Promise<PriceBounds> => {
    return queryCategoryPriceBounds({ category });
  },
  ["getCategoryPriceBounds"],
  {
    tags: ["catalog"],
    revalidate: 3600,
  }
);
