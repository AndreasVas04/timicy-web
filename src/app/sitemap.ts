/**
 * Dynamic XML sitemap — serves all product pages, category pages, and the
 * homepage with hreflang alternates for el, en, and x-default.
 *
 * Placed at src/app/sitemap.ts (app root, outside [locale]) so Next.js
 * serves it at /sitemap.xml automatically via the Metadata API.
 *
 * The sitemap is revalidated once per day (revalidate = 86400) regardless
 * of individual page revalidation settings.
 */

import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { createAnonClient } from "@/lib/supabase/anon";
import { buildProductSlug } from "@/lib/slug";
import { CATEGORY_SLUGS } from "@/lib/categories";

/** Revalidate the sitemap once every 24 hours. */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAnonClient();

  // ---------------------------------------------------------------
  // 1. Fetch ALL products, paginated in batches of 1 000.
  //
  //    Supabase / PostgREST caps every response at 1 000 rows by default.
  //    We loop with .range(from, from + 999) until a page returns fewer
  //    than 1 000 rows, which signals we've reached the last page.
  // ---------------------------------------------------------------
  const PAGE_SIZE = 1000;
  const allProducts: { id: number; canonical_title: string; updated_at: string }[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("id, canonical_title, updated_at")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Sitemap: failed to fetch products at offset ${from}: ${error.message}`);
    }

    if (data) {
      allProducts.push(...data);
    }

    // If fewer than PAGE_SIZE rows came back, this was the last page.
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // ---------------------------------------------------------------
  // 2. Build one sitemap entry per product with el / en / x-default
  //    alternates. x-default points to the Greek (el) URL since Greek
  //    is the site's default locale.
  // ---------------------------------------------------------------
  const productEntries: MetadataRoute.Sitemap = allProducts.map((product) => {
    const slug = buildProductSlug(product.id, product.canonical_title);
    const elUrl = `${SITE_URL}/el/product/${slug}`;
    const enUrl = `${SITE_URL}/en/product/${slug}`;

    return {
      url: elUrl,
      lastModified: product.updated_at,
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: {
        languages: {
          el: elUrl,
          en: enUrl,
          "x-default": elUrl,
        },
      },
    };
  });

  // ---------------------------------------------------------------
  // 3. Build one sitemap entry per category (21 slugs from the single
  //    source of truth in src/lib/categories.ts).
  // ---------------------------------------------------------------
  const categoryEntries: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => {
    const elUrl = `${SITE_URL}/el/category/${slug}`;
    const enUrl = `${SITE_URL}/en/category/${slug}`;

    return {
      url: elUrl,
      changeFrequency: "daily" as const,
      priority: 0.6,
      alternates: {
        languages: {
          el: elUrl,
          en: enUrl,
          "x-default": elUrl,
        },
      },
    };
  });

  // ---------------------------------------------------------------
  // 4. Homepage entry — highest priority.
  // ---------------------------------------------------------------
  const homeEntry: MetadataRoute.Sitemap[number] = {
    url: `${SITE_URL}/el`,
    changeFrequency: "daily" as const,
    priority: 1.0,
    alternates: {
      languages: {
        el: `${SITE_URL}/el`,
        en: `${SITE_URL}/en`,
        "x-default": `${SITE_URL}/el`,
      },
    },
  };

  // Home first, then categories, then products.
  return [homeEntry, ...categoryEntries, ...productEntries];
}
