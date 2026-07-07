/**
 * Parse a raw page query-string value into a safe, 1-based page number.
 *
 * Shared by category and search pages so that generateMetadata and the
 * page component always agree on which page is being rendered — a mismatch
 * would cause the canonical URL to point to the wrong page.
 *
 * NOTE: this helper intentionally does NOT clamp to the total page count.
 * Metadata cannot know the total without a data fetch, and the page
 * component already performs its own totalPages clamp after fetching.
 * A bookmarked out-of-range URL will therefore declare its requested page
 * in the canonical — an accepted rare edge case that resolves itself once
 * the page component redirects or clamps.
 */
export function parsePageParam(raw: string | undefined): number {
  const parsed = parseInt(raw ?? "1", 10);
  // Guard against NaN, Infinity, and negative/zero values.
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}
