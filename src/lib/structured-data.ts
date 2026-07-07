/**
 * Builds a schema.org Product + AggregateOffer JSON-LD object for
 * structured data on product pages.
 *
 * This module is intentionally pure — no Supabase, no next/cache, no
 * server-only imports — so the function stays unit-testable in any
 * JS runtime.
 *
 * The returned plain object is meant to be serialized with
 * JSON.stringify and injected into a <script type="application/ld+json">
 * tag by the page component.
 */

import { decodeEntities } from "@/lib/decode-entities";

/* -------------------------------------------------------------------------- */
/*  Input types                                                               */
/* -------------------------------------------------------------------------- */

/** Minimal product fields needed for the JSON-LD node. */
interface ProductInput {
  id: number;
  canonical_title: string;
  brand: string | null;
  image_url: string | null;
}

/** A single deduplicated store offer as returned by getOffersForProduct. */
interface OfferInput {
  store: string;
  current_price: number | null;
  available: boolean;
  product_url: string;
}

/** All arguments accepted by buildProductJsonLd. */
interface BuildProductJsonLdInput {
  product: ProductInput;
  offers: OfferInput[];
  /** Absolute URL of the product page (e.g. "https://timicy.com/el/product/foo-123"). */
  productUrl: string;
}

/* -------------------------------------------------------------------------- */
/*  Builder function                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Build a schema.org Product JSON-LD object with an AggregateOffer node.
 *
 * Returns `null` when there are no priced offers — an incomplete Product
 * node (missing offers entirely) is worse than omitting JSON-LD altogether,
 * because Google may flag it as an error in Search Console.
 *
 * Availability logic:
 *  - If at least one priced offer is available → aggregate over available
 *    offers only, mark InStock.
 *  - Otherwise → aggregate over all priced offers, mark OutOfStock.
 *
 * lowPrice and highPrice are always emitted, even when they are equal —
 * this is valid per the schema.org specification.
 */
export function buildProductJsonLd(
  input: BuildProductJsonLdInput,
): Record<string, unknown> | null {
  const { product, offers, productUrl } = input;

  // ── 1. Filter to offers that have a price ──────────────────────────────
  //    Offers without a price cannot contribute to an AggregateOffer.
  const pricedOffers = offers.filter(
    (o) => o.current_price != null,
  );

  // No priced offers → skip JSON-LD entirely.
  if (pricedOffers.length === 0) return null;

  // ── 2. Determine availability and the set of offers to aggregate ──────
  //    Prefer available offers; fall back to all priced offers when
  //    everything is out of stock.
  const availableOffers = pricedOffers.filter((o) => o.available);

  const hasAvailable = availableOffers.length > 0;
  const aggregateSource = hasAvailable ? availableOffers : pricedOffers;
  const availability = hasAvailable
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  // ── 3. Compute price range ────────────────────────────────────────────
  const prices = aggregateSource.map((o) => Number(o.current_price));
  const lowPrice = Number(Math.min(...prices).toFixed(2));
  const highPrice = Number(Math.max(...prices).toFixed(2));
  const offerCount = aggregateSource.length;

  // ── 4. Assemble the JSON-LD object ────────────────────────────────────
  //    Optional fields (image, brand) are spread conditionally so the
  //    output never contains null-valued properties.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: decodeEntities(product.canonical_title),
    url: productUrl,
    // Include product image only when one exists.
    ...(product.image_url ? { image: product.image_url } : {}),
    // Include brand as a schema.org Brand node only when known.
    ...(product.brand
      ? { brand: { "@type": "Brand", name: product.brand } }
      : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice,
      highPrice,
      offerCount,
      availability,
    },
  };

  return jsonLd;
}
