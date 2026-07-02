/**
 * robots.txt — tells search engine crawlers which paths to index and
 * where to find the sitemap.
 *
 * Placed at src/app/robots.ts (app root, outside [locale]) so Next.js
 * serves it at /robots.txt automatically via the Metadata API.
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * Indexing gate — mirrors the same check used in next.config.ts and layout.tsx.
 * When ALLOW_INDEXING is not exactly "true", robots.txt will disallow all
 * crawling so search engines don't index preview/staging deployments.
 */
const allowIndexing = process.env.ALLOW_INDEXING === "true";

export default function robots(): MetadataRoute.Robots {
  // When indexing is not allowed, return a minimal disallow-all ruleset
  // with no sitemap and no host — crawlers should stay away entirely.
  if (!allowIndexing) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  // Production ruleset — allow everything except private/utility paths,
  // and point crawlers to the sitemap and canonical host.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/el/alerts/",
        "/en/alerts/",
        "/el/search",
        "/en/search",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
