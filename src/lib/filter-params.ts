/**
 * Category filter parsing, slug mapping, and URL building.
 *
 * This module is intentionally NOT marked "server-only" so it can be
 * imported by both server components (the category page) and client
 * components (the filter panel UI added in a follow-up job).
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Availability toggle: "in" shows only in-stock products (default),
 *  "all" includes unavailable products as well. */
export type StockFilter = "in" | "all";

/** Parsed and validated filter parameters from the URL query string. */
export type FilterParams = {
  /** Normalized brand slugs, deduped and sorted alphabetically. */
  brands: string[];
  /** Minimum price in integer euros, or null if not set. */
  min: number | null;
  /** Maximum price in integer euros, or null if not set. */
  max: number | null;
  /** Availability filter: "in" (default) or "all". */
  stock: StockFilter;
  /** True when any filter is actively narrowing the result set. */
  hasFilters: boolean;
};

/* -------------------------------------------------------------------------- */
/*  Parsing                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Parse a string as a non-negative integer. Returns null for anything
 * that isn't a pure digit string (e.g. negative numbers, decimals,
 * alphabetic characters, empty strings).
 */
function parseIntegerParam(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse and validate filter parameters from a URL search params object.
 *
 * All validation is silent: invalid values are dropped, never thrown.
 * This makes the parser safe to call with arbitrary user input from
 * the query string.
 */
export function parseFilterParams(search: {
  brand?: string;
  min?: string;
  max?: string;
  stock?: string;
}): FilterParams {
  // --- Brands ---
  // Split on commas, normalize each to lowercase, drop empties,
  // dedupe via Set, then sort alphabetically.
  const brands = search.brand
    ? [
        ...new Set(
          search.brand
            .split(",")
            .map((b) => b.trim().toLowerCase())
            .filter((b) => b.length > 0)
        ),
      ].sort()
    : [];

  // --- Price range ---
  // Accept only non-negative integer strings (strict /^\d+$/ check).
  let min = parseIntegerParam(search.min);
  let max = parseIntegerParam(search.max);

  // If both are set but min > max, discard both entirely (no silent
  // swapping — the user's intent is ambiguous).
  if (min !== null && max !== null && min > max) {
    min = null;
    max = null;
  }

  // --- Stock ---
  // "all" is the only recognized non-default value; everything else
  // (including undefined) normalizes to "in". "in" is never written
  // back to URLs since it is the default.
  const stock: StockFilter = search.stock === "all" ? "all" : "in";

  // --- hasFilters ---
  // True when any parameter is actively narrowing the result set
  // beyond the unfiltered default.
  const hasFilters =
    brands.length > 0 || min !== null || max !== null || stock === "all";

  return { brands, min, max, stock, hasFilters };
}

/* -------------------------------------------------------------------------- */
/*  Brand slug mapping                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Convert a canonical brand name to a URL-safe slug.
 *
 * Lowercase, trim, and collapse internal whitespace runs into single
 * hyphens. A measured fact: the brand column has zero casing/whitespace
 * duplicates, so this is a clean 1:1 mapping with no collision handling
 * needed.
 */
export function brandToSlug(brand: string): string {
  return brand.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Build a slug-to-canonical lookup map from a list of canonical brand
 * values (as stored in the database). Used to resolve URL slugs back
 * to their database values for query filtering.
 */
export function buildSlugMap(brands: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const brand of brands) {
    map.set(brandToSlug(brand), brand);
  }
  return map;
}

/* -------------------------------------------------------------------------- */
/*  URL building                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Build a deterministic category page URL with sort, filters, and page.
 *
 * This is the single central URL builder for the category page — all
 * sort links, pagination links, and filter links use this function to
 * ensure consistent parameter ordering and omission rules.
 *
 * Query params are emitted in a fixed order: sort, brand, min, max,
 * stock, page. Default values are omitted to keep URLs clean:
 *   - sort: omitted when "popular" (the default)
 *   - brand: omitted when empty
 *   - min/max: omitted when null
 *   - stock: omitted when "in" (the default)
 *   - page: omitted when 1 (first page)
 *
 * IMPORTANT: callers that change filters should always pass page: 1,
 * because any change to filters resets pagination to the first page.
 */
export function buildCategoryUrl(args: {
  category: string;
  sort: string;
  page: number;
  filters: FilterParams;
}): string {
  const params = new URLSearchParams();

  // Fixed parameter order for deterministic, reproducible URLs.
  if (args.sort !== "popular") params.set("sort", args.sort);
  if (args.filters.brands.length > 0)
    params.set("brand", args.filters.brands.join(","));
  if (args.filters.min !== null) params.set("min", String(args.filters.min));
  if (args.filters.max !== null) params.set("max", String(args.filters.max));
  if (args.filters.stock === "all") params.set("stock", "all");
  if (args.page > 1) params.set("page", String(args.page));

  const qs = params.toString();
  return `/category/${args.category}${qs ? `?${qs}` : ""}`;
}
