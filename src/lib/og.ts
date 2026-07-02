/**
 * Shared Open Graph constants used across all page metadata generators.
 */

// Branded 1200×630 social-share banner, generated on the /og route via next/og.
export const OG_FALLBACK_IMAGE = "/og";

/**
 * Map internal locale codes to OpenGraph-standard locale strings.
 * OG expects language_TERRITORY format (e.g. "el_CY", "en_US").
 */
export const OG_LOCALE: Record<string, string> = {
  el: "el_CY",
  en: "en_US",
};
