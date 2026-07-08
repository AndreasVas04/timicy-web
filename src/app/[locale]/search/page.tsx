import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/ProductCard";
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
 *
 * The title is loaded from the "search" message namespace so it renders in
 * the correct language for the current locale (e.g. "Αναζήτηση προϊόντων"
 * for Greek, "Product search" for English).
 */
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });

  return {
    title: t("metaTitle"),
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
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl mb-6">
          {t("resultsTitle", { query: q || "…" })}
        </h1>
        <p className="rounded-lg border border-dashed border-line py-16 text-center text-mute">
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
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl mb-2">
        {t("resultsTitle", { query: q })}
      </h1>

      {/* Result count */}
      <p className="text-sm tabular-nums text-mute mb-6">
        {t("resultsCount", { total })}
      </p>

      {/* Empty state: quiet message on a dashed sheet. */}
      {products.length === 0 && (
        <p className="rounded-lg border border-dashed border-line py-16 text-center text-mute">
          {t("noResultsFull", { query: q })}
        </p>
      )}

      {/* Product grid — shared ProductCard, same ledger layout as the
          category page (see ProductCard component). */}
      {products.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {products.map((product) => {
            /* Savings chip — only shown when the price spread is
               meaningful enough to be worth highlighting.
               • Absolute arm (>= €10): catches big-ticket items where
                 5 % would be too strict (e.g. €200 -> €191 = €9, skip).
               • Percentage arm (>= 5 % of max AND >= €2): catches cheap
                 items where €10 would never trigger (e.g. €25 -> €20 = €5).
               A chip that says "−€0" or "−€1" undermines trust, so
               both arms enforce a sensible floor.
               (Identical logic lives in the category page — keep in sync.) */
            let savingsText: string | null = null;
            if (
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
                      ? tc("fromPrice", {
                          price: `€${Number(product.min_price).toFixed(2)}`,
                        })
                      : null
                  }
                  metaText={
                    product.store_count > 0
                      ? tc("inStores", { count: product.store_count })
                      : null
                  }
                  savingsText={savingsText}
                  noImageText={t("noImage")}
                  unavailable={false}
                />
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination controls — same pattern as category pages.
          Sorting is not available on search results (V1 is relevance-only;
          the RPC already ranks by prefix match > substring > trigram sim). */}
      {totalPages > 1 && (
        <nav
          aria-label={t("paginationLabel")}
          className="flex items-center justify-center gap-3 py-6"
        >
          {page > 1 ? (
            <Link
              href={buildUrl(page - 1)}
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
              href={buildUrl(page + 1)}
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
