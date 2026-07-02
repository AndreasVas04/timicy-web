import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * next-intl plugin wraps the Next.js config to enable server-side
 * message loading via the request configuration in src/i18n/request.ts.
 */
const withNextIntl = createNextIntlPlugin();

/**
 * Indexing gate — the site is noindex by default. Set ALLOW_INDEXING="true"
 * in the environment (e.g. Vercel production) to let search engines crawl.
 * Any other value (or unset) keeps the site hidden from crawlers.
 */
const allowIndexing = process.env.ALLOW_INDEXING === "true";

const nextConfig: NextConfig = {
  images: {
    // Product images are hotlinked from external store CDNs. `unoptimized`
    // serves them directly (no Vercel proxy/resize) to avoid free-tier image
    // optimization limits; remotePatterns still allowlists the permitted hosts.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "www.stephanis.com.cy" },
      { protocol: "https", hostname: "external.webstorage.gr" },
      { protocol: "https", hostname: "asset.productmarketingcloud.com" },
      { protocol: "https", hostname: "asset-prod1a-euw.productmarketingcloud.com" },
      { protocol: "https", hostname: "electroline.cy" },
      { protocol: "https", hostname: "data.electroline.cy" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
    ],
  },

  /**
   * Custom HTTP headers — when indexing is disallowed, attach an
   * X-Robots-Tag header to every response so crawlers that ignore
   * robots.txt or <meta> tags still receive a noindex directive.
   * When ALLOW_INDEXING is "true", no extra headers are added.
   */
  async headers() {
    // Allow indexing: no extra headers needed.
    if (allowIndexing) {
      return [];
    }

    // Block indexing: apply X-Robots-Tag to all routes.
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
