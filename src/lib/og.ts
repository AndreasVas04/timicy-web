/**
 * Shared Open Graph constants used across all page metadata generators.
 */

// Temporary OG image; design pass will replace with a proper 1200×630 branded banner.
export const OG_FALLBACK_IMAGE = "/TimiCY_logo.png";

/**
 * Map internal locale codes to OpenGraph-standard locale strings.
 * OG expects language_TERRITORY format (e.g. "el_CY", "en_US").
 */
export const OG_LOCALE: Record<string, string> = {
  el: "el_CY",
  en: "en_US",
};
