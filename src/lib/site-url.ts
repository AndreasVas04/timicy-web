/**
 * Central accessor for the public site URL.
 *
 * Every module that needs to build an absolute URL (sitemap, robots.txt,
 * canonical links, OG images, etc.) should import SITE_URL from here
 * instead of reading process.env directly.  This guarantees a single,
 * consistent base URL with no trailing slash.
 *
 * The value MUST be set via the SITE_URL environment variable (e.g. in
 * .env.local or the hosting platform).  If the variable is missing the
 * module throws immediately — we never silently fall back to localhost or
 * a preview URL, because doing so would leak incorrect URLs into search
 * engine indexes and social previews.
 */

const raw = process.env.SITE_URL;

if (!raw) {
  throw new Error(
    "SITE_URL environment variable is not set. " +
      "Add SITE_URL=https://example.com to .env.local (no trailing slash)."
  );
}

/** Absolute site URL without a trailing slash (e.g. "https://timicy.com"). */
export const SITE_URL: string = raw.replace(/\/+$/, "");
