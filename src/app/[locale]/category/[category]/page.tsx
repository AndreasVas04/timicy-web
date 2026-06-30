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
import { buildProductSlug } from "@/lib/slug";
import { decodeEntities } from "@/lib/decode-entities";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";
import {
  getCategoryProducts,
  isValidSort,
  type CategorySort,
} from "@/lib/queries/category";

/**
 * ISR: category pages are pre-rendered for all 21 categories × 2 locales.
 * Revalidate every hour as a baseline; on-demand revalidation via a webhook
 * will be added later so listings refresh when the scraper updates data.
 */
export const revalidate = 3600;

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
}: PageProps): Promise<Metadata> {
  const { locale, category } = await params;

  if (!isValidCategory(category)) return {};

  const t = await getTranslations({ locale, namespace: "category" });
  const label = getCategoryLabel(category, locale);

  // Canonical URL excludes sort/page params — those are crawlable variants
  // but canonical should point to the clean category URL so search engines
  // consolidate link equity on a single canonical page.
  const canonicalPath = `/${locale}/category/${category}`;

  // Build hreflang alternates for every supported locale.
  // x-default points to the Greek (primary) version of this category.
  const languages: Record<string, string> = {
    "x-default": `/el/category/${category}`,
  };
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}/category/${category}`;
  }

  const title = `${label} — TimiCY`;
  const description = t("metaDescription", { category: label });

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
      url: canonicalPath,
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

  // Parse page number; clamp to >= 1.
  let page = parseInt(search.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

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
              sort === opt.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
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
                className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow h-full"
              >
                {/* Product image with fallback */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={decodeEntities(product.canonical_title)}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No image</span>
                  )}
                </div>

                <div className="p-3 flex flex-col gap-1">
                  {/* Brand */}
                  {product.brand && (
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {product.brand}
                    </span>
                  )}

                  {/* Title — decode HTML entities for clean display */}
                  <span className="text-sm font-medium line-clamp-2">
                    {decodeEntities(product.canonical_title)}
                  </span>

                  {/* Price */}
                  {product.min_price != null ? (
                    <span className="text-sm font-semibold text-green-700">
                      {t("fromPrice", {
                        price: `€${Number(product.min_price).toFixed(2)}`,
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}

                  {/* Store count */}
                  {product.offer_count > 0 && (
                    <span className="text-xs text-gray-500">
                      {t("inStores", { count: product.offer_count })}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-2 py-6"
        >
          {/* Previous page */}
          {page > 1 ? (
            <Link
              href={buildUrl(sort, page - 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("prev")}
            </Link>
          ) : (
            <span className="px-3 py-1 text-sm border border-gray-200 rounded text-gray-300">
              {t("prev")}
            </span>
          )}

          {/* Page indicator */}
          <span className="text-sm text-gray-600 px-2">
            {t("pageOf", { current: page, total: totalPages })}
          </span>

          {/* Next page */}
          {page < totalPages ? (
            <Link
              href={buildUrl(sort, page + 1)}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              {t("next")}
            </Link>
          ) : (
            <span className="px-3 py-1 text-sm border border-gray-200 rounded text-gray-300">
              {t("next")}
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
