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
 * Fetch all store offers linked to a product, sorted cheapest-first.
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

  return data ?? [];
}
