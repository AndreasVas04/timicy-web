import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  isValidCategory,
  getCategoryLabel,
  CATEGORY_SLUGS,
  type CategorySlug,
} from "@/lib/categories";
import Image from "next/image";
import { buildProductSlug } from "@/lib/slug";
import { decodeEntities } from "@/lib/decode-entities";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";
import { parsePageParam } from "@/lib/page-param";
import {
  getCategoryProducts,
  isValidSort,
  type CategorySort,
} from "@/lib/queries/category";

/**
 * ISR: category pages are pre-rendered for all 21 categories × 2 locales.
 * The cache is refreshed on-demand by the nightly pipeline's revalidation
 * webhook; the 24 h window is only a fallback ceiling.
 */
export const revalidate = 86400;

/* -------------------------------------------------------------------------- */
/*  Types for async params/searchParams (Next.js 15 App Router convention)    */
/* -------------------------------------------------------------------------- */

type PageProps = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

/* -------------------------------------------------------------------------- */
/*  Static generation — pre-render all 21 categories × 2 locales (42 shells) */
/* -------------------------------------------------------------------------- */

export function generateStaticParams() {
  return CATEGORY_SLUGS.flatMap((category) =>
    routing.locales.map((locale) => ({ locale, category }))
  );
}

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { locale, category } = await params;
  const search = await searchParams;

  if (!isValidCategory(category)) return {};

  const t = await getTranslations({ locale, namespace: "category" });
  const label = getCategoryLabel(category, locale);

  // Determine the current page so paginated views get their own canonical.
  // The sort parameter is intentionally NOT read here — sorted variants
  // show the same content in a different order, so they should all
  // consolidate onto the same canonical URL per page.
  const page = parsePageParam(search.page);
  const pageSuffix = page > 1 ? `?page=${page}` : "";

  // Canonical URL includes ?page=N for page ≥ 2 so search engines treat
  // each paginated view as its own indexable page.  Page 1 gets the clean
  // URL (no query string) for maximum link-equity consolidation.
  const canonicalPath = `/${locale}/category/${category}${pageSuffix}`;

  // Build hreflang alternates for every supported locale.
  // x-default points to the Greek (primary) version of this category.
  // Each alternate carries the same page suffix so crawlers associate
  // the correct paginated view across locales.
  const languages: Record<string, string> = {
    "x-default": `/el/category/${category}${pageSuffix}`,
  };
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}/category/${category}${pageSuffix}`;
  }

  // Use the localized title template from messages so the title is
  // translated for each locale (e.g. "Τηλεοράσεις — Σύγκριση Τιμών …").
  const title = t("metaTitle", { category: label });
  const description = t("metaDescription", { category: label });

  // Open Graph url stays on the clean path (no page suffix) — social
  // previews don't need pagination; the shared link should always
  // land on the first page of the category.
  const ogUrl = `/${locale}/category/${category}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      // hreflang alternates so search engines serve the right locale.
      languages,
    },
    // Open Graph metadata for rich social previews (Facebook, LinkedIn, etc.)
    openGraph: {
      title,
      description,
      url: ogUrl,
      siteName: "TimiCY",
      locale: OG_LOCALE[locale] ?? "el_CY",
      type: "website",
      images: [OG_FALLBACK_IMAGE],
    },
    // Twitter/X card metadata — large-image format for visual impact.
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_FALLBACK_IMAGE],
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

/** Default number of products per page. */
const PAGE_SIZE = 24;

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { locale, category } = await params;
  const search = await searchParams;

  setRequestLocale(locale);

  // Validate the category slug — 404 for anything not in our known list.
  if (!isValidCategory(category)) notFound();

  const t = await getTranslations("category");
  const label = getCategoryLabel(category as CategorySlug, locale);

  // Parse and validate sort parameter; default to 'popular'.
  const sort: CategorySort =
    search.sort && isValidSort(search.sort) ? search.sort : "popular";

  // Parse page number; clamp to >= 1.  Uses the shared parsePageParam
  // helper so the page component and generateMetadata always agree on
  // which page is being rendered (prevents canonical URL mismatches).
  let page = parsePageParam(search.page);

  // Fetch products for this category, page, and sort order.
  const { rows: products, total } = await getCategoryProducts({
    category,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // If the requested page exceeds the total, clamp to the last page and
  // re-fetch. This handles bookmarked URLs where products have been removed.
  // In practice this is rare, so the double-fetch cost is acceptable.
  if (page > totalPages && total > 0) {
    page = totalPages;
    const clamped = await getCategoryProducts({
      category,
      sort,
      page,
      pageSize: PAGE_SIZE,
    });
    // Replace products in-place for rendering below.
    products.length = 0;
    products.push(...clamped.rows);
  }

  /* --- Sort options ------------------------------------------------------- */

  const sortOptions: { key: CategorySort; label: string }[] = [
    { key: "popular", label: t("sortPopular") },
    { key: "price_asc", label: t("sortPriceAsc") },
    { key: "price_desc", label: t("sortPriceDesc") },
  ];

  /* --- Helper to build pagination/sort URLs ------------------------------ */

  /** Build a category page URL preserving the given sort and page. */
  function buildUrl(s: CategorySort, p: number): string {
    const params = new URLSearchParams();
    if (s !== "popular") params.set("sort", s);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/category/${category}${qs ? `?${qs}` : ""}`;
  }

  /* --- Render ------------------------------------------------------------- */

  return (
    <div>
      {/* Category heading */}
      <h1 className="text-2xl font-bold sm:text-3xl mb-6">{label}</h1>

      {/* Sort controls — plain links, no client JS required */}
      <nav aria-label={t("sortLabel")} className="flex flex-wrap gap-2 mb-6">
        <span className="text-sm text-gray-500 self-center mr-1">
          {t("sortLabel")}:
        </span>
        {sortOptions.map((opt) => (
          <Link
            key={opt.key}
            href={buildUrl(opt.key, 1)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              // Active sort pill uses the ink/brand palette instead of leftover blue.
              sort === opt.key
                ? "bg-ink text-white border-ink"
                : "bg-surface text-gray-700 border-line hover:border-brand hover:text-brand"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </nav>

      {/* Empty state */}
      {products.length === 0 && (
        <p className="text-gray-500 py-12 text-center">{t("empty")}</p>
      )}

      {/* Product grid */}
      {products.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/product/${buildProductSlug(product.id, product.canonical_title)}`}
                className="group flex flex-col h-full bg-surface border border-line rounded-xl overflow-hidden
                           transition-all duration-200 hover:border-brand hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Image area: soft neutral backdrop; subtle zoom on hover for tactile feedback. */}
                <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                  {/* next/image with `fill` — lazy-loads by default;
                      `unoptimized` in next.config.ts avoids Vercel proxy costs. */}
                  {/* Product image — reduced opacity when all offers are
                      unavailable to visually demote the card. */}
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={decodeEntities(product.canonical_title)}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className={`object-contain transition-transform duration-200 group-hover:scale-[1.03]${
                        product.has_available_offer === false ? " opacity-60" : ""
                      }`}
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">{t("noImage")}</span>
                  )}
                  {/* Savings chip — only shown when the price spread is
                      meaningful enough to be worth highlighting AND the
                      product has at least one available offer. Showing a
                      savings claim on an unbuyable product is misleading.
                      • Absolute arm (≥ €10): catches big-ticket items where
                        5 % would be too strict (e.g. €200 → €191 = €9, skip).
                      • Percentage arm (≥ 5 % of max AND ≥ €2): catches cheap
                        items where €10 would never trigger (e.g. €25 → €20 = €5).
                      A chip that says "−€0" or "−€1" undermines trust, so
                      both arms enforce a sensible floor. */}
                  {(() => {
                    if (
                      product.has_available_offer === false ||
                      product.store_count < 2 ||
                      product.max_price == null ||
                      product.min_price == null
                    )
                      return null;

                    const savings =
                      Number(product.max_price) - Number(product.min_price);
                    const isMeaningful =
                      savings >= 10 ||
                      (savings >= 0.05 * Number(product.max_price) &&
                        savings >= 2);

                    if (!isMeaningful) return null;

                    return (
                      <span className="absolute top-2 left-2 rounded-md bg-save px-2 py-0.5 text-xs font-medium text-white">
                        −€{savings.toFixed(0)}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-col gap-1 p-3 grow">
                  {product.brand && (
                    <span className="text-xs uppercase tracking-wide text-gray-500">{product.brand}</span>
                  )}
                  <span className="text-sm font-medium text-ink line-clamp-2">
                    {decodeEntities(product.canonical_title)}
                  </span>

                  {/* Price block pushed to the card bottom so all cards align
                      in the grid row. When the product has no available offer
                      the price is rendered in muted gray (text-gray-400)
                      instead of emerald (text-price), because the displayed
                      amount is a last-known price, not a currently buyable one.
                      An "unavailable" label is shown below the price. */}
                  <div className="mt-auto pt-1">
                    {product.min_price != null ? (
                      <span
                        className={`block text-lg font-semibold tabular-nums ${
                          product.has_available_offer === false
                            ? "text-gray-400"
                            : "text-price"
                        }`}
                      >
                        {t("fromPrice", { price: `€${Number(product.min_price).toFixed(2)}` })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {product.has_available_offer === false && (
                      <span className="text-xs text-gray-400">
                        {t("unavailable")}
                      </span>
                    )}
                    {product.has_available_offer !== false &&
                      product.store_count > 0 && (
                        <span className="text-xs text-gray-500">
                          {t("inStores", { count: product.store_count })}
                        </span>
                      )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav
          aria-label={t("paginationLabel")}
          className="flex items-center justify-center gap-2 py-6"
        >
          {/* Previous page — active state uses the surface/brand palette; disabled stays muted. */}
          {page > 1 ? (
            <Link
              href={buildUrl(sort, page - 1)}
              className="px-3 py-1 text-sm border border-line rounded-lg bg-surface hover:border-brand hover:text-brand transition-colors"
            >
              {t("prev")}
            </Link>
          ) : (
            <span className="px-3 py-1 text-sm border border-line rounded-lg text-gray-300">
              {t("prev")}
            </span>
          )}

          {/* Page indicator */}
          <span className="text-sm text-gray-600 px-2">
            {t("pageOf", { current: page, total: totalPages })}
          </span>

          {/* Next page — active state uses the surface/brand palette; disabled stays muted. */}
          {page < totalPages ? (
            <Link
              href={buildUrl(sort, page + 1)}
              className="px-3 py-1 text-sm border border-line rounded-lg bg-surface hover:border-brand hover:text-brand transition-colors"
            >
              {t("next")}
            </Link>
          ) : (
            <span className="px-3 py-1 text-sm border border-line rounded-lg text-gray-300">
              {t("next")}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
