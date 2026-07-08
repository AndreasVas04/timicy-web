import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, permanentRedirect } from "next/navigation";

import { parseProductId, buildProductSlug } from "@/lib/slug";
import {
  getProductById,
  getOffersForProduct,
  getMergedRedirectTarget,
} from "@/lib/queries/product";
import { getPriceHistoryForProduct } from "@/lib/queries/price-history";
import { reconstructCheapestSeries } from "@/lib/price-history/reconstruct";
import { routing } from "@/i18n/routing";
import { decodeEntities } from "@/lib/decode-entities";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";
import { SITE_URL } from "@/lib/site-url";
import { buildProductJsonLd } from "@/lib/structured-data";
import { isValidCategory, getCategoryLabel, type CategorySlug } from "@/lib/categories";
import Image from "next/image";
import PriceAlertForm from "@/components/PriceAlertForm";
import PriceHistoryChart from "@/components/PriceHistoryChartLazy";

/**
 * On-demand ISR: product pages are not pre-built (no generateStaticParams).
 * The cache is refreshed on-demand by the nightly pipeline's revalidation
 * webhook; the 24 h window is only a fallback ceiling.
 */
export const revalidate = 86400;

/* -------------------------------------------------------------------------- */
/*  Types for async params (Next.js 15 App Router convention)                 */
/* -------------------------------------------------------------------------- */

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

/* -------------------------------------------------------------------------- */
/*  Metadata (canonical URL + hreflang alternates)                            */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const id = parseProductId(slug);
  if (id === null) return {};

  // Uses the same React cache() as the page — no duplicate DB hit.
  const product = await getProductById(id);
  if (!product) return {};

  const t = await getTranslations({ locale, namespace: "product" });

  const canonicalSlug = buildProductSlug(id, product.canonical_title);

  // Build hreflang alternates for every supported locale.
  // x-default points to the Greek (primary) version of this product.
  const languages: Record<string, string> = {
    "x-default": `/el/product/${canonicalSlug}`,
  };
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}/product/${canonicalSlug}`;
  }

  // Decode HTML entities so titles like "Sony &amp; Bose" render cleanly
  // in browser tabs, search results, and social previews.
  const decodedTitle = decodeEntities(product.canonical_title);

  // Localized title from the message template (e.g. "{title} — Τιμή στην Κύπρο | TimiCY").
  const title = t("metaTitle", { title: decodedTitle });

  // Fetch offers (render-deduplicated via cache() — the page component
  // calls the same function and shares the result within this render).
  const offers = await getOffersForProduct(id);

  // Find the cheapest available offer — same logic as the page component:
  // first offer with available === true and a non-null price (the list is
  // already sorted cheapest-first by dedupeOffersByStore).
  const bestOffer = offers.find(
    (o) => o.available && o.current_price != null
  );

  // When we have a best price, build a richer meta description that
  // includes the starting price and store count. Otherwise fall back
  // to the generic description template.
  const description = bestOffer
    ? t("metaDescriptionWithPrice", {
        title: decodedTitle,
        price: `€${Number(bestOffer.current_price).toFixed(2)}`,
        count: offers.length,
      })
    : t("metaDescription", { title: decodedTitle });
  const selfUrl = `/${locale}/product/${canonicalSlug}`;

  // Use the product's own image for social previews; fall back to the site
  // logo when no product image is available.
  const ogImage = product.image_url ?? OG_FALLBACK_IMAGE;

  return {
    title,
    description,
    alternates: {
      canonical: selfUrl,
      languages,
    },
    // Open Graph metadata for rich social previews (Facebook, LinkedIn, etc.)
    openGraph: {
      title,
      description,
      url: selfUrl,
      siteName: "TimiCY",
      locale: OG_LOCALE[locale] ?? "el_CY",
      type: "website",
      images: [ogImage],
    },
    // Twitter/X card metadata — uses the large-image card format for
    // maximum visual impact in the feed.
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default async function ProductPage({ params }: PageProps) {
  const { locale, slug } = await params;

  // Enable static rendering support for this locale.
  setRequestLocale(locale);

  /* --- Slug resolver ---------------------------------------------------- */

  // 1. Extract the numeric product id from the slug suffix.
  const id = parseProductId(slug);
  if (id === null) notFound();

  // 2. Fetch the product from the database.
  const product = await getProductById(id);
  if (!product) {
    // The id may belong to a product that was absorbed into another
    // canonical during a data-pipeline merge. merged_products keeps a
    // single-hop redirect trail so old URLs (still present in search
    // engines and the sitemap) permanently redirect instead of 404ing.
    const survivorId = await getMergedRedirectTarget(id);
    if (survivorId !== null) {
      const survivor = await getProductById(survivorId);
      if (survivor) {
        permanentRedirect(
          `/${locale}/product/${buildProductSlug(survivor.id, survivor.canonical_title)}`
        );
      }
    }
    notFound();
  }

  // 3. Canonical redirect: if the slug text doesn't match the current
  //    canonical_title, redirect to the correct URL so search engines
  //    consolidate link equity on a single canonical URL.
  const canonical = buildProductSlug(id, product.canonical_title);
  if (slug !== canonical) {
    // permanentRedirect issues HTTP 308, the App Router permanent-redirect
    // equivalent of 301; search engines treat it the same for canonicalization.
    permanentRedirect(`/${locale}/product/${canonical}`);
  }

  // 4. needs_review is an internal flag for data-quality review; it does NOT
  //    affect display. These are legitimate products — render normally.

  /* --- Data loading ----------------------------------------------------- */

  const offers = await getOffersForProduct(id);

  // Build the absolute product URL and the schema.org JSON-LD structured
  // data object.  buildProductJsonLd returns null when no priced offers
  // exist, in which case we skip rendering the <script> tag entirely.
  const productUrl = `${SITE_URL}/${locale}/product/${canonical}`;
  const jsonLd = buildProductJsonLd({ product, offers, productUrl });

  // Fetch raw price-history events and reconstruct the cheapest-per-day
  // time-series.  Reconstruction runs OUTSIDE the cached read, on every
  // render, so the now-edge stays current — this is intentional.
  const priceHistory = await getPriceHistoryForProduct(id);
  const pricePoints = reconstructCheapestSeries(priceHistory, new Date());

  const t = await getTranslations("product");

  // Find the cheapest AVAILABLE offer to highlight as best price.
  // Offers that are unavailable must NOT be highlighted, even if numerically
  // cheaper than all available offers.
  const bestOffer = offers.find((o) => o.available && o.current_price != null);

  // Price range across AVAILABLE offers — shown as a quiet factual note
  // below the price plate. Only meaningful when 2+ stores have a price
  // and the spread is non-zero (min != max).
  const availablePrices = offers
    .filter((o) => o.available && o.current_price != null)
    .map((o) => Number(o.current_price));
  const priceRange =
    availablePrices.length >= 2 &&
    Math.min(...availablePrices) !== Math.max(...availablePrices)
      ? { min: Math.min(...availablePrices), max: Math.max(...availablePrices) }
      : null;

  // Fallback when EVERY store is out of stock: show the last known (cheapest)
  // price in muted styling instead of a green "best price" that promises a deal.
  const lastKnownOffer = !bestOffer
    ? offers.find((o) => o.current_price != null)
    : null;

  // Freshness: newest scrape timestamp across the representative offers.
  const lastScraped = offers.reduce<string | null>(
    (acc, o) => (o.last_scraped_at && (!acc || o.last_scraped_at > acc) ? o.last_scraped_at : acc),
    null
  );
  const freshnessDate = lastScraped
    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(lastScraped))
    : null;

  // Display the category using the same localized labels that the category
  // pages use (from src/lib/categories.ts). Falls back to a simple slug
  // humanization for any category not in the known list.
  const humanCategory = product.category
    ? isValidCategory(product.category)
      ? getCategoryLabel(product.category as CategorySlug, locale)
      : product.category.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;

  /* --- Render ----------------------------------------------------------- */

  return (
    <article>
      {/* Schema.org Product + AggregateOffer structured data for rich
          search results.  The .replace() escapes '<' as \u003c to prevent
          a crafted product title from breaking out of the script tag. */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}

      {/* Product header */}
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 mb-10">
        {/* Product image on a white sheet with a hairline border.
            `relative` enables next/image `fill` mode; `unoptimized` in
            next.config.ts avoids Vercel proxy costs. */}
        <div className="relative w-full sm:w-72 h-64 sm:h-72 bg-surface border border-line rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={decodeEntities(product.canonical_title)}
              fill
              sizes="(max-width: 640px) 100vw, 288px"
              className="object-contain p-4"
            />
          ) : (
            <span className="text-faint text-sm">{t("noImage")}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 min-w-0">
          {product.brand && (
            <span className="text-xs uppercase tracking-[0.08em] text-faint">{product.brand}</span>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            {decodeEntities(product.canonical_title)}
          </h1>
          {humanCategory && <p className="text-sm text-mute">{humanCategory}</p>}

          {/* Price plate: the page's focal point and the brand's signature
              element. The best available price sits on a deep navy plate
              with the graph-paper grid, set very large in white; store
              attribution and the quiet factual price-range line sit
              underneath in the same muted ink-soft tone, so the big
              price stays the plate's only loud element. */}
          {bestOffer ? (
            <div className="mt-4 max-w-md rounded-lg bg-ink-deep grid-paper px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                {t("bestPrice")}
              </p>
              <p className="price-figure mt-1 text-4xl sm:text-5xl font-extrabold text-white">
                €{Number(bestOffer.current_price).toFixed(2)}
              </p>
              <p className="text-sm text-ink-soft mt-2">{t("atStore", { store: bestOffer.store })}</p>
              {/* Price range: same treatment as the store line, tabular
                  figures, shown only for a real spread (2+ priced stores,
                  min != max). */}
              {priceRange && (
                <p className="text-sm text-ink-soft tabular-nums mt-1">
                  {t("priceRange", {
                    min: `€${priceRange.min.toFixed(2)}`,
                    max: `€${priceRange.max.toFixed(2)}`,
                  })}
                </p>
              )}
            </div>
          ) : lastKnownOffer ? (
            <div className="mt-4 max-w-md rounded-lg border border-line bg-surface px-5 py-4">
              {/* All stores out of stock — honest muted state, no navy plate promise. */}
              <p className="text-sm font-medium text-mute">{t("allUnavailable")}</p>
              <p className="text-sm text-mute mt-1">
                {t("lastKnownPrice")}:{" "}
                <span className="price-figure font-bold text-ink">€{Number(lastKnownOffer.current_price).toFixed(2)}</span>
              </p>
            </div>
          ) : null}

          {/* Freshness badge — small trust signal. */}
          {freshnessDate && (
            <p className="text-xs text-faint mt-3">{t("pricesUpdated", { date: freshnessDate })}</p>
          )}
        </div>
      </div>

      {/* Offers section: the comparison ledger. One white sheet, one row
          per store, hairline rules between rows. The cheapest available
          offer carries a teal left rail and tint; every other row keeps a
          transparent rail so columns stay aligned. */}
      <section>
        <h2 className="text-base sm:text-lg font-bold tracking-tight mb-3">
          {offers.length > 0
            ? t("pricesFromStores", { count: offers.length })
            : t("noOffers")}
        </h2>

        {offers.length > 0 && (
          <ul className="divide-y divide-line border border-line rounded-lg bg-surface overflow-hidden">
            {offers.map((offer, idx) => {
              // Check if this is the best (cheapest available) offer.
              const isBest =
                bestOffer &&
                offer.store === bestOffer.store &&
                offer.current_price === bestOffer.current_price &&
                offer.product_url === bestOffer.product_url &&
                idx === offers.indexOf(bestOffer);

              return (
                <li
                  key={`${offer.store}-${offer.product_url}-${idx}`}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 border-l-[3px] ${
                    isBest
                      ? "border-l-brand bg-brand-tint/60"
                      : "border-l-transparent"
                  }`}
                >
                  {/* Store + availability. The cheapest available offer is
                      indicated by the teal rail and the price plate above,
                      no extra badge needed (keep it simple). */}
                  <div className="flex flex-col gap-0.5 min-w-0 sm:flex-1">
                    <span className="font-semibold text-ink">{offer.store}</span>
                    {!offer.available ? (
                      <span className="text-sm text-red-600">{t("outOfStock")}</span>
                    ) : (
                      <span className="text-sm text-stock">{t("available")}</span>
                    )}
                  </div>

                  {/* Price column: right-aligned on desktop so amounts line
                      up down the ledger; large heading-face tabular figures. */}
                  {offer.current_price != null ? (
                    <span
                      className={`price-figure text-xl sm:text-2xl font-extrabold sm:text-right ${
                        offer.available ? "text-ink" : "text-faint"
                      }`}
                    >
                      €{Number(offer.current_price).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-faint sm:text-right">—</span>
                  )}

                  {/* CTA: solid navy for purchasable offers; quiet bordered variant for
                      out-of-stock so the page never "sells" an unavailable item. */}
                  <a
                    href={offer.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap sm:ml-6 ${
                      offer.available
                        ? "bg-ink text-white hover:bg-ink-deep"
                        : "border border-line text-mute hover:border-brand hover:text-brand"
                    }`}
                  >
                    {t("goToStore")}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Price history chart section — shows the cheapest available price
          over time as a step-line chart.  Empty state is handled inline
          with a muted message when no history data exists yet. */}
      <section className="mt-10">
        <h2 className="text-base sm:text-lg font-bold tracking-tight mb-3">{t("priceHistory")}</h2>

        {pricePoints.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-mute">
            {t("noPriceHistory")}
          </p>
        ) : (
          <PriceHistoryChart
            points={pricePoints}
            locale={locale}
            labels={{
              unavailable: t("unavailable"),
              collectingHistory: t("collectingHistory"),
              rangeWeek: t("rangeWeek"),
              rangeMonth: t("rangeMonth"),
              range6mo: t("range6mo"),
              rangeYear: t("rangeYear"),
              rangeAll: t("rangeAll"),
            }}
          />
        )}
      </section>

      {/* Price alert subscription form — allows users to get notified when
          the price drops to their target. Uses the product's current min_price
          as the default/hint value for the target price. */}
      <PriceAlertForm
        productId={product.id}
        currentMinPrice={product.min_price ? Number(product.min_price) : 0}
        locale={locale}
      />
    </article>
  );
}
