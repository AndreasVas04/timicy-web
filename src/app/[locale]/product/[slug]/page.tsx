import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, permanentRedirect } from "next/navigation";

import { parseProductId, buildProductSlug } from "@/lib/slug";
import { getProductById, getOffersForProduct } from "@/lib/queries/product";
import { getPriceHistoryForProduct } from "@/lib/queries/price-history";
import { reconstructCheapestSeries } from "@/lib/price-history/reconstruct";
import { routing } from "@/i18n/routing";
import { decodeEntities } from "@/lib/decode-entities";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";
import PriceAlertForm from "@/components/PriceAlertForm";
import PriceHistoryChart from "@/components/PriceHistoryChart";

/**
 * On-demand ISR: product pages are not pre-built (no generateStaticParams).
 * Revalidate cached pages every hour as a baseline.
 * On-demand revalidation via a webhook will be added later so prices refresh
 * when the scraper updates data.
 */
export const revalidate = 3600;

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

  const title = `${decodedTitle} — TimiCY`;
  const description = t("metaDescription", { title: decodedTitle });
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
  if (!product) notFound();

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

  // Humanize the category slug for display (e.g. "washing_machines" -> "Washing Machines").
  // Localized category labels will be added in a later prompt.
  const humanCategory = product.category
    ? product.category
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c: string) => c.toUpperCase())
    : null;

  /* --- Render ----------------------------------------------------------- */

  return (
    <article>
      {/* Product header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Product image with fallback */}
        <div className="w-full sm:w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={decodeEntities(product.canonical_title)}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-gray-400 text-sm">No image</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {decodeEntities(product.canonical_title)}
          </h1>

          {product.brand && (
            <p className="text-gray-600">
              <span className="font-medium">{t("brand")}:</span> {product.brand}
            </p>
          )}

          {humanCategory && (
            <p className="text-gray-600">
              <span className="font-medium">{t("category")}:</span>{" "}
              {humanCategory}
            </p>
          )}

          {/* Best price highlight */}
          {bestOffer && (
            <p className="text-xl font-semibold text-green-700 mt-2">
              {t("bestPrice")}: €{Number(bestOffer.current_price).toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Offers section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          {offers.length > 0
            ? t("pricesFromStores", { count: offers.length })
            : t("noOffers")}
        </h2>

        {offers.length > 0 && (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
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
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 ${
                    isBest ? "bg-green-50" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{offer.store}</span>
                    {offer.current_price != null ? (
                      <span className="text-lg font-semibold">
                        €{Number(offer.current_price).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                    {!offer.available && (
                      <span className="text-sm text-red-600">
                        {t("outOfStock")}
                      </span>
                    )}
                    {offer.available && (
                      <span className="text-sm text-green-600">
                        {t("available")}
                      </span>
                    )}
                  </div>

                  {/* "Go to store" link opens in a new tab.
                      nofollow/sponsored rel can be added later when monetization
                      starts; omitted for now. */}
                  <a
                    href={offer.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
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
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">{t("priceHistory")}</h2>

        {pricePoints.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noPriceHistory")}</p>
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
