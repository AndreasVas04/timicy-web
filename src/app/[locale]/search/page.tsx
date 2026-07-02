import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buildProductSlug } from "@/lib/slug";
import { decodeEntities } from "@/lib/decode-entities";
import { getSearchResults } from "@/lib/queries/search";

/* -------------------------------------------------------------------------- */
/*  Types for async params/searchParams (Next.js 15 App Router convention)    */
/* -------------------------------------------------------------------------- */

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Search result pages are noindex, follow — we don't want Google to index
 * the infinite set of ?q= URLs (which would dilute crawl budget and create
 * thin content), but we do want it to follow product links found on the page.
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Search — TimiCY",
    robots: { index: false, follow: true },
  };
}

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

/** Default number of products per page — matches category pages. */
const PAGE_SIZE = 24;

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const search = await searchParams;

  setRequestLocale(locale);

  const t = await getTranslations("search");
  const tc = await getTranslations("category");

  // Parse and validate query string.
  const q = (search.q ?? "").trim();

  // Parse page number; clamp to >= 1.
  let page = parseInt(search.page ?? "1", 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  // If query is missing or too short, show a prompt instead of running a
  // search. The RPC's trigram/ILIKE logic isn't meaningful below 2 chars.
  if (q.length < 2) {
    return (
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl mb-6">
          {t("resultsTitle", { query: q || "…" })}
        </h1>
        <p className="text-gray-500 py-12 text-center">
          {t("minCharsPrompt")}
        </p>
      </div>
    );
  }

  // Fetch paginated search results.
  const { rows: products, total } = await getSearchResults({
    q,
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Clamp page to last page if it overshoots (e.g. bookmarked URL).
  if (page > totalPages && total > 0) {
    page = totalPages;
  }

  /** Build a search page URL preserving the query and changing the page. */
  function buildUrl(p: number): string {
    const params = new URLSearchParams();
    params.set("q", q);
    if (p > 1) params.set("page", String(p));
    return `/search?${params.toString()}`;
  }

  /* --- Render ------------------------------------------------------------- */

  return (
    <div>
      {/* Page heading */}
      <h1 className="text-2xl font-bold sm:text-3xl mb-2">
        {t("resultsTitle", { query: q })}
      </h1>

      {/* Result count */}
      <p className="text-sm text-gray-500 mb-6">
        {t("resultsCount", { total })}
      </p>

      {/* Empty state */}
      {products.length === 0 && (
        <p className="text-gray-500 py-12 text-center">
          {t("noResultsFull", { query: q })}
        </p>
      )}

      {/* Product grid — same card markup/style as the category page */}
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
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={decodeEntities(product.canonical_title)}
                      className="max-w-full max-h-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">No image</span>
                  )}
                  {/* Savings chip: only when the product is genuinely cheaper somewhere (2+ stores, price spread). */}
                  {product.store_count >= 2 &&
                    product.max_price != null &&
                    product.min_price != null &&
                    Number(product.max_price) > Number(product.min_price) && (
                      <span className="absolute top-2 left-2 rounded-md bg-save px-2 py-0.5 text-xs font-medium text-white">
                        −€{(Number(product.max_price) - Number(product.min_price)).toFixed(0)}
                      </span>
                    )}
                </div>

                <div className="flex flex-col gap-1 p-3 grow">
                  {product.brand && (
                    <span className="text-xs uppercase tracking-wide text-gray-500">{product.brand}</span>
                  )}
                  <span className="text-sm font-medium text-ink line-clamp-2">
                    {decodeEntities(product.canonical_title)}
                  </span>

                  {/* Price block pushed to the card bottom so all cards align in the grid row. */}
                  <div className="mt-auto pt-1">
                    {product.min_price != null ? (
                      <span className="block text-lg font-semibold text-price tabular-nums">
                        {tc("fromPrice", { price: `€${Number(product.min_price).toFixed(2)}` })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                    {product.store_count > 0 && (
                      <span className="text-xs text-gray-500">{tc("inStores", { count: product.store_count })}</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination controls — same pattern as category pages.
          Sorting is not available on search results (V1 is relevance-only;
          the RPC already ranks by prefix match > substring > trigram sim). */}
      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-2 py-6"
        >
          {/* Previous page */}
          {page > 1 ? (
            <Link
              href={buildUrl(page - 1)}
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
              href={buildUrl(page + 1)}
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
