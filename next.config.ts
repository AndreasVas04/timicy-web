import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * next-intl plugin wraps the Next.js config to enable server-side
 * message loading via the request configuration in src/i18n/request.ts.
 */
const withNextIntl = createNextIntlPlugin();

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
};

export default withNextIntl(nextConfig);
