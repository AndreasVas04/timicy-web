import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { SortSelect } from "@/components/SortSelect";
import {
  isValidCategory,
  getCategoryLabel,
  CATEGORY_SLUGS,
  type CategorySlug,
} from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";
import { buildProductSlug } from "@/lib/slug";
import { decodeEntities } from "@/lib/decode-entities";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";
import { parsePageParam } from "@/lib/page-param";
import { parseFilterParams, buildCategoryUrl } from "@/lib/filter-params";
import {
  getCategoryProducts,
  queryCategoryProducts,
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
  searchParams: Promise<{
    sort?: string;
    page?: string;
    brand?: string;
    min?: string;
    max?: string;
    stock?: string;
  }>;
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

  // Parse filter parameters from the URL query string (brand, min, max,
  // stock). Invalid values are silently dropped by the parser.
  const filters = parseFilterParams(search);

  // Fetch products for this category, page, sort order, and filters.
  // When filters are active, go directly through the raw uncached query
  // (filtered requests are long-tail and would not benefit from caching).
  // The unfiltered default path uses the cached wrapper for performance.
  const { rows: products, total } = filters.hasFilters
    ? await queryCategoryProducts({
        category,
        sort,
        page,
        pageSize: PAGE_SIZE,
        filters,
      })
    : await getCategoryProducts({
        category,
        sort,
        page,
        pageSize: PAGE_SIZE,
      });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // If the requested page exceeds the total, clamp to the last page and
  // re-fetch through the same path (cached or uncached) with the same
  // filters. This handles bookmarked URLs where products have been removed.
  // In practice this is rare, so the double-fetch cost is acceptable.
  if (page > totalPages && total > 0) {
    page = totalPages;
    const clamped = filters.hasFilters
      ? await queryCategoryProducts({
          category,
          sort,
          page,
          pageSize: PAGE_SIZE,
          filters,
        })
      : await getCategoryProducts({
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

  /* --- Render ------------------------------------------------------------- */

  return (
    <div>
      {/* Page header row: heading left, sort control right (wraps on
          small screens). The heading uses the identity voice: heading
          face, extrabold, tight tracking. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{label}</h1>

        {/* Sort dropdown — a native <select> replaces the previous
            segmented control, which overflowed at 375px with the longer
            Greek labels. The dropdown handles long text gracefully on
            every viewport width and platform. */}
        <SortSelect
          label={t("sortLabel")}
          options={sortOptions.map((opt) => ({
            value: opt.key,
            label: opt.label,
            href: buildCategoryUrl({
              category,
              sort: opt.key,
              page: 1,
              filters,
            }),
          }))}
          currentValue={sort}
        />
      </div>

      {/* Empty state: quiet message on a dashed sheet. */}
      {products.length === 0 && (
        <p className="rounded-lg border border-dashed border-line py-16 text-center text-mute">
          {t("empty")}
        </p>
      )}

      {/* Product grid — shared ProductCard, ledger layout (see component). */}
      {products.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {products.map((product) => {
            const unavailable = product.has_available_offer === false;

            /* Savings chip — only shown when the price spread is
               meaningful enough to be worth highlighting AND the
               product has at least one available offer. Showing a
               savings claim on an unbuyable product is misleading.
               • Absolute arm (>= €10): catches big-ticket items where
                 5 % would be too strict (e.g. €200 -> €191 = €9, skip).
               • Percentage arm (>= 5 % of max AND >= €2): catches cheap
                 items where €10 would never trigger (e.g. €25 -> €20 = €5).
               A chip that says "−€0" or "−€1" undermines trust, so
               both arms enforce a sensible floor. */
            let savingsText: string | null = null;
            if (
              !unavailable &&
              product.store_count >= 2 &&
              product.max_price != null &&
              product.min_price != null
            ) {
              const savings =
                Number(product.max_price) - Number(product.min_price);
              const isMeaningful =
                savings >= 10 ||
                (savings >= 0.05 * Number(product.max_price) && savings >= 2);
              if (isMeaningful) savingsText = `−€${savings.toFixed(0)}`;
            }

            return (
              <li key={product.id}>
                <ProductCard
                  href={`/product/${buildProductSlug(product.id, product.canonical_title)}`}
                  title={decodeEntities(product.canonical_title)}
                  brand={product.brand}
                  imageUrl={product.image_url}
                  priceText={
                    product.min_price != null
                      ? t("fromPrice", {
                          price: `€${Number(product.min_price).toFixed(2)}`,
                        })
                      : null
                  }
                  metaText={
                    unavailable
                      ? t("unavailable")
                      : product.store_count > 0
                        ? t("inStores", { count: product.store_count })
                        : null
                  }
                  savingsText={savingsText}
                  noImageText={t("noImage")}
                  unavailable={unavailable}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination controls — matches the segmented sort control:
          bordered prev/next buttons flanking a tabular page indicator. */}
      {totalPages > 1 && (
        <nav
          aria-label={t("paginationLabel")}
          className="flex items-center justify-center gap-3 py-6"
        >
          {page > 1 ? (
            <Link
              href={buildCategoryUrl({ category, sort, page: page - 1, filters })}
              className="rounded-md border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
            >
              {t("prev")}
            </Link>
          ) : (
            <span className="rounded-md border border-line px-3.5 py-1.5 text-sm text-faint">
              {t("prev")}
            </span>
          )}

          {/* Page indicator */}
          <span className="px-1 text-sm tabular-nums text-mute">
            {t("pageOf", { current: page, total: totalPages })}
          </span>

          {page < totalPages ? (
            <Link
              href={buildCategoryUrl({ category, sort, page: page + 1, filters })}
              className="rounded-md border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
            >
              {t("next")}
            </Link>
          ) : (
            <span className="rounded-md border border-line px-3.5 py-1.5 text-sm text-faint">
              {t("next")}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
