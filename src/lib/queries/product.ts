import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * Cached product fetch — two layers of caching work together:
 *
 * 1. unstable_cache (Next.js Data Cache): persists the Supabase response
 *    across requests until the 'catalog' tag is revalidated (POST
 *    /api/revalidate) or the time backstop expires. The cache key is
 *    composed of keyParts + the serialized function arguments, so each
 *    product id gets its own entry automatically.
 *
 * 2. React cache(): deduplicates calls within a single server render so
 *    the page component and generateMetadata share one cache lookup
 *    instead of two.
 *
 * Composition: cache( unstable_cache( innerFn, keyParts, options ) )
 */
export const getProductById = cache(
  unstable_cache(
    async (id: number) => {
      const supabase = createAnonClient();

      // Select only the columns needed for the product page and metadata.
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, canonical_title, brand, category, image_url, min_price, max_price, offer_count, needs_review"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch product:", error.message);
        return null;
      }

      return data;
    },
    ["getProductById"],
    {
      tags: ["catalog"],
      // revalidate: 3600 is the interim time backstop; raise to 86400 in
      // Step 11 when the webhook caller is connected, to match the
      // page-level revalidate.
      revalidate: 3600,
    }
  )
);

/**
 * Look up the redirect target for an absorbed (merged) product id.
 * When canonical products are merged in the data pipeline, the absorbed
 * product row is deleted and a row is written to `merged_products`
 * mapping old_id -> new_id. The writer guarantees chain compression
 * (every mapping is single-hop), so one lookup fully resolves the target.
 * Returns the surviving product id, or null if the id was never merged.
 */
export const getMergedRedirectTarget = unstable_cache(
  async (oldId: number): Promise<number | null> => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("merged_products")
      .select("new_id")
      .eq("old_id", oldId)
      .maybeSingle();

    // If the lookup fails or returns no row, the id was never merged.
    if (error || !data) return null;

    // Return the surviving product's id for the caller to redirect to.
    return data.new_id;
  },
  ["getMergedRedirectTarget"],
  {
    tags: ["catalog"],
    revalidate: 3600,
  }
);

/**
 * De-duplicate offers so only ONE representative per store is shown.
 *
 * A single store can have multiple store_products rows for the same canonical
 * product because color/finish variants (e.g. Black, Silver, Midnight Blue)
 * are separate offers that the matching layer correctly groups under one
 * canonical product. Color is offer-level detail, not a separate product, so
 * the price-comparison UI should show one row per store, not one per variant.
 *
 * Representative selection rule (per store):
 *  1. Prefer available offers. Among those, pick the lowest current_price.
 *  2. If no offer is available, pick the lowest current_price among
 *     unavailable offers.
 *  3. A null current_price is treated as +Infinity (never preferred).
 *
 * The returned list is sorted for neutral, deterministic display:
 *   1. Available offers first (unavailable offers sink to the bottom).
 *   2. Ascending price within each availability tier (nulls last).
 *   3. Alphabetical store name as the final tie-break, so stores at
 *      the same price appear in a predictable, fair order.
 *
 * NOTE: A future enhancement may add a "from €X" hint when a store has
 * multiple variants at different prices. This is deferred for now.
 */
function dedupeOffersByStore<
  T extends { store: string; current_price: number | null; available: boolean },
>(offers: T[]): T[] {
  const byStore = new Map<string, T>();

  for (const offer of offers) {
    const existing = byStore.get(offer.store);

    if (!existing) {
      byStore.set(offer.store, offer);
      continue;
    }

    // Compare: available beats unavailable; within the same availability
    // tier, lower price wins; null price is worst.
    const pick = pickRepresentative(existing, offer);
    if (pick === offer) {
      byStore.set(offer.store, offer);
    }
  }

  const representatives = Array.from(byStore.values());

  // Sort: available first, then price ascending (nulls last), then
  // store name alphabetical as the final tie-break for fairness.
  representatives.sort((a, b) => {
    // 1. Available offers always appear before unavailable ones.
    if (a.available && !b.available) return -1;
    if (!a.available && b.available) return 1;

    // 2. Price ascending within the same availability tier; null
    //    prices (unknown) sink to the end.
    if (a.current_price == null && b.current_price == null) {
      // Both null — fall through to store-name tie-break.
    } else if (a.current_price == null) {
      return 1;
    } else if (b.current_price == null) {
      return -1;
    } else {
      const diff = Number(a.current_price) - Number(b.current_price);
      if (diff !== 0) return diff;
    }

    // 3. Alphabetical store name — deterministic, neutral ordering
    //    when price and availability are identical.
    return a.store.localeCompare(b.store);
  });

  return representatives;
}

/** Compare two offers from the same store and return the better representative. */
function pickRepresentative<
  T extends { current_price: number | null; available: boolean },
>(a: T, b: T): T {
  // Available offers always beat unavailable ones.
  if (a.available && !b.available) return a;
  if (!a.available && b.available) return b;

  // Same availability tier — compare prices (null = worst).
  const priceA = a.current_price != null ? Number(a.current_price) : Infinity;
  const priceB = b.current_price != null ? Number(b.current_price) : Infinity;

  return priceB < priceA ? b : a;
}

/**
 * Fetch all store offers linked to a product, de-duplicated to one
 * representative per store and sorted cheapest-first.
 *
 * Two layers of caching (same pattern as getProductById):
 *
 * 1. unstable_cache (Next.js Data Cache): persists the Supabase response
 *    across requests until the 'catalog' tag is revalidated or the time
 *    backstop expires.
 *
 * 2. React cache(): deduplicates calls within a single server render so
 *    generateMetadata (which now needs the best price for the meta
 *    description) and the page component share one lookup instead of two.
 */
export const getOffersForProduct = cache(
  unstable_cache(
  async (productId: number) => {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from("store_products")
      .select(
        // last_scraped_at powers the "Prices updated" freshness badge on the product page.
        "store, current_price, product_url, available, title, image_url, last_scraped_at"
      )
      .eq("product_id", productId)
      // Cheapest first; nulls (unknown price) go to the end.
      .order("current_price", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Failed to fetch offers:", error.message);
      return [];
    }

    // De-duplicate to one representative offer per store (see
    // dedupeOffersByStore for the rationale around color/finish variants).
    return dedupeOffersByStore(data ?? []);
  },
  ["getOffersForProduct"],
  {
    tags: ["catalog"],
    // revalidate: 3600 is the interim time backstop; raise to 86400 in
    // Step 11 when the webhook caller is connected, to match the
    // page-level revalidate.
    revalidate: 3600,
  }
  )
);
