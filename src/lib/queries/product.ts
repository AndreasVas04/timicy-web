import "server-only";

import { cache } from "react";
import { createAnonClient } from "@/lib/supabase/anon";

/**
 * Cached product fetch — React's cache() deduplicates calls within a single
 * request, so the page component and generateMetadata share one DB query.
 */
export const getProductById = cache(async (id: number) => {
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
});

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
 * The returned list is sorted by current_price ascending, nulls last.
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

  // Sort by current_price ascending, nulls last.
  representatives.sort((a, b) => {
    if (a.current_price == null && b.current_price == null) return 0;
    if (a.current_price == null) return 1;
    if (b.current_price == null) return -1;
    return Number(a.current_price) - Number(b.current_price);
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
 * All variant rows are fetched so the de-duplication logic can choose the
 * best representative per store.
 *
 * Does NOT use cache() — offers are only fetched once by the page component,
 * and generateMetadata doesn't need them.
 */
export async function getOffersForProduct(productId: number) {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from("store_products")
    .select(
      "store, current_price, product_url, available, title, image_url"
    )
    .eq("product_id", productId)
    // Cheapest first; nulls (unknown price) go to the end.
    .order("current_price", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Failed to fetch offers:", error.message);
    return [];
  }

  // De-duplicate to one representative offer per store (see dedupeOffersByStore
  // for the rationale around color/finish variants).
  return dedupeOffersByStore(data ?? []);
}
