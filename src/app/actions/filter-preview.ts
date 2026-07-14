"use server";

/**
 * Server action for the interactive filter-preview seam.
 *
 * Called by the FilterPanel client component to fetch a live result
 * count (and optionally refreshed price bounds) as the user adjusts
 * filters before tapping Apply. The default category page path never
 * invokes this action.
 *
 * All inputs are treated as UNTRUSTED (client-originated). Validation
 * mirrors parseFilterParams semantics: invalid values are silently
 * normalized or dropped, never thrown.
 */

import { isValidCategory } from "@/lib/categories";
import { type StockFilter } from "@/lib/filter-params";
import {
  queryCategoryFilterPreview,
  type PriceBounds,
} from "@/lib/queries/category";

/** Shape returned on success. */
type PreviewResult =
  | { error: true }
  | { error?: undefined; count: number; bounds: PriceBounds | null };

/**
 * Fetch a filter-preview (count + optional bounds) for the given
 * filter state. Input is validated server-side before querying.
 */
export async function getFilterPreview(input: {
  category: string;
  brands: string[];
  min: number | null;
  max: number | null;
  stock: string;
  skipBounds: boolean;
}): Promise<PreviewResult> {
  try {
    // --- Category validation ---
    if (!input.category || !isValidCategory(input.category)) {
      return { error: true };
    }

    // --- Brand validation ---
    // Must be an array; cap entries, coerce each to a safe string,
    // trim, lowercase, length-cap, drop empties, then dedupe.
    const rawBrands = Array.isArray(input.brands) ? input.brands : [];
    const brands = [
      ...new Set(
        rawBrands
          .slice(0, 100)
          .map((b) => String(b).trim().toLowerCase().slice(0, 100))
          .filter((b) => b.length > 0)
      ),
    ];

    // --- Price validation ---
    // Accept only non-negative integers; otherwise null. If both set
    // and min > max, drop BOTH (mirrors parseFilterParams semantics
    // exactly, no swapping).
    let min: number | null =
      input.min !== null &&
      typeof input.min === "number" &&
      Number.isInteger(input.min) &&
      input.min >= 0
        ? input.min
        : null;
    let max: number | null =
      input.max !== null &&
      typeof input.max === "number" &&
      Number.isInteger(input.max) &&
      input.max >= 0
        ? input.max
        : null;
    if (min !== null && max !== null && min > max) {
      min = null;
      max = null;
    }

    // --- Stock validation ---
    // "all" passes through; anything else normalizes to "in".
    const stock: StockFilter = input.stock === "all" ? "all" : "in";

    // --- Build FilterParams and query ---
    const hasFilters =
      brands.length > 0 || min !== null || max !== null || stock === "all";

    const { count, bounds } = await queryCategoryFilterPreview({
      category: input.category,
      filters: { brands, min, max, stock, hasFilters },
      skipBounds: input.skipBounds,
    });

    return { count, bounds };
  } catch {
    return { error: true };
  }
}
