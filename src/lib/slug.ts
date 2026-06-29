/**
 * Shared slug utilities — single source of truth for product URL slugs.
 *
 * URL pattern: /{locale}/product/{slugified-title}-p{id}
 * The text portion is purely cosmetic (for SEO); product lookup always uses
 * the trailing numeric id parsed from "-p{id}".
 */

/**
 * Convert a product title into a URL-safe slug.
 *
 * Steps:
 *  1. Lowercase the input.
 *  2. Unicode-normalize (NFD) and strip combining marks (diacritics).
 *  3. Replace any run of non-alphanumeric characters with a single hyphen.
 *  4. Trim leading/trailing hyphens and collapse any repeated hyphens.
 *  5. If the result is empty (e.g. non-Latin/Greek-only title), return "product".
 *
 * NOTE: Greek characters are stripped by the diacritics removal + non-[a-z0-9]
 * replacement. Proper Greek-to-Latin transliteration is deferred — this is
 * cosmetic only since lookup is always by numeric id.
 */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    // Decompose Unicode so diacritics become separate combining marks.
    .normalize("NFD")
    // Strip combining marks (accents, diacritics).
    .replace(/[\u0300-\u036f]/g, "")
    // Replace any run of characters that are not a-z or 0-9 with a single hyphen.
    .replace(/[^a-z0-9]+/g, "-")
    // Trim leading/trailing hyphens.
    .replace(/^-+|-+$/g, "")
    // Collapse any repeated hyphens (defensive).
    .replace(/-{2,}/g, "-");

  return slug || "product";
}

/**
 * Build the full product slug for use in URLs.
 * Example: buildProductSlug(59220, "AEG LFR85146QE") => "aeg-lfr85146qe-p59220"
 */
export function buildProductSlug(id: number, canonicalTitle: string): string {
  return `${slugify(canonicalTitle)}-p${id}`;
}

/**
 * Parse the numeric product id from a slug string.
 *
 * Matches the trailing "-p{digits}" pattern anchored at the end of the string.
 * Returns the integer id, or null if the slug doesn't contain a valid id suffix.
 */
export function parseProductId(slug: string): number | null {
  const match = slug.match(/-p(\d+)$/);
  if (!match) return null;

  const id = parseInt(match[1], 10);
  // Guard against NaN (shouldn't happen with \d+, but be safe).
  return Number.isFinite(id) ? id : null;
}
