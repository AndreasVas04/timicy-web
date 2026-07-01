import "server-only";

import { unstable_cache } from "next/cache";
import { createAnonClient } from "@/lib/supabase/anon";
import type { OfferSeries, OfferEvent } from "@/lib/price-history/reconstruct";

/**
 * Fetch raw price-history data for every store-product linked to a canonical
 * product.  Returns an array of OfferSeries — one entry per store_products
 * row, each carrying its historical price_history events and its live state.
 *
 * This module is responsible for fetching and shaping only; it does NOT call
 * the reconstruction function.  Reconstruction (cheapest-per-day series) is
 * done in the page component so the pure function stays testable without
 * mocking Supabase.
 *
 * Wrapped in unstable_cache using the same shape as getOffersForProduct in
 * product.ts: keyParts array, catalog tag, and 1-hour revalidation backstop.
 */
export const getPriceHistoryForProduct = unstable_cache(
  async (productId: number): Promise<OfferSeries[]> => {
    const supabase = createAnonClient();

    // Single query using Supabase's embedded resource syntax to join
    // store_products with its related price_history rows in one round-trip.
    const { data, error } = await supabase
      .from("store_products")
      .select(
        "id, store, current_price, available, price_history(price, available, recorded_at)"
      )
      .eq("product_id", productId);

    if (error) {
      console.error("Failed to fetch price history:", error.message);
      return [];
    }

    // Map the snake_case DB columns to the camelCase OfferSeries shape
    // expected by the reconstruction function.
    return (data ?? []).map(
      (row: {
        id: number;
        store: string;
        current_price: number | null;
        available: boolean;
        price_history: { price: number; available: boolean; recorded_at: string }[];
      }): OfferSeries => ({
        storeProductId: row.id,
        store: row.store,
        currentPrice: row.current_price,
        currentAvailable: row.available,
        events: (row.price_history ?? []).map(
          (ev): OfferEvent => ({
            price: ev.price,
            available: ev.available,
            recordedAt: ev.recorded_at,
          })
        ),
      })
    );
  },
  ["getPriceHistoryForProduct"],
  {
    tags: ["catalog"],
    // revalidate: 3600 is the interim time backstop; raise to 86400 in
    // Step 11 when the webhook caller is connected, to match the
    // page-level revalidate.
    revalidate: 3600,
  }
);
