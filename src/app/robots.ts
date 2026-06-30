/**
 * robots.txt — tells search engine crawlers which paths to index and
 * where to find the sitemap.
 *
 * Placed at src/app/robots.ts (app root, outside [locale]) so Next.js
 * serves it at /robots.txt automatically via the Metadata API.
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
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
