import { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { CATEGORY_SLUGS, getCategoryLabel } from "@/lib/categories";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";

/* -------------------------------------------------------------------------- */
/*  Types for async params (Next.js 15 App Router convention)                 */
/* -------------------------------------------------------------------------- */

type PageProps = {
  params: Promise<{ locale: string }>;
};

/* -------------------------------------------------------------------------- */
/*  Metadata (canonical, hreflang, OpenGraph, Twitter)                        */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: "home" });

  const title = `TimiCY — ${t("title")}`;
  const description = t("tagline");
  const selfUrl = `/${locale}`;

  // Build hreflang alternates for every supported locale.
  // x-default points to the Greek (primary) homepage.
  const languages: Record<string, string> = { "x-default": "/el" };
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}`;
  }

  return {
    title,
    description,
    alternates: {
      // Canonical URL for the current locale's homepage.
      canonical: selfUrl,
      // hreflang alternates so search engines serve the right locale.
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

/**
 * Homepage — server-rendered brand page in two moves:
 *
 * 1. Hero band: full-bleed deep-navy strip carrying only the brand
 *    statement (home.title), set very large over a faint graph-paper
 *    grid, with the stepped price-line motif (the visual shorthand for
 *    "we track prices dropping") descending beside it.
 * 2. Category ledger sheet: a single white sheet, divided internally by
 *    hairlines into 21 category cells, deliberately overlapping the navy
 *    band so it reads as a document laid on the brand surface. This is
 *    the primary conversion path.
 *
 * Search lives in the site header (HeaderSearch) so it is available on
 * every page including this one; the hero intentionally has no search box.
 */
export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Hero band                                                          */}
      {/* ------------------------------------------------------------------ */}
      {/* The <main> wrapper in the layout constrains content to max-w-6xl
          with px-4/py-8, so the band "breaks out" to full viewport width:
          w-screen wide, anchored to the viewport center via left-1/2 +
          -translate-x-1/2. -mt-8 cancels the main's top padding so the
          navy band sits flush against the header. The few pixels of
          horizontal overflow this can cause (100vw includes the scrollbar
          on some platforms) are discarded by `overflow-x: clip` on <html>
          (see globals.css). Extra bottom padding leaves room for the
          category sheet below to overlap the band. */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 -mt-8 bg-ink-deep grid-paper">
        {/* Re-establish the site container inside the full-bleed band so
            the text lines up with the rest of the page content. */}
        <div className="mx-auto flex max-w-6xl items-center gap-12 px-4 pt-14 pb-24 sm:pt-24 sm:pb-32">
          {/* The single brand statement, set as large as the band allows.
              Manrope extrabold with tight tracking is the identity voice. */}
          <h1 className="max-w-3xl text-[2.375rem] leading-[1.05] font-extrabold tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>

          {/* Decorative stepped price-line motif: a price-history step
              chart in miniature (price holds, drops, holds, drops, ends
              lower at a teal dot). Purely ornamental: aria-hidden and
              only shown on lg+ where there is room next to the text.
              Colors come from the brand token via currentColor. */}
          <svg
            aria-hidden="true"
            className="ml-auto hidden shrink-0 text-brand lg:block"
            width="320"
            height="176"
            viewBox="0 0 320 176"
            fill="none"
          >
            {/* Step line: horizontal hold, vertical drop, repeated. */}
            <path
              d="M4 36 H100 V78 H188 V124 H296"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />
            {/* End dot: the "current best price" the line settles on. */}
            <circle cx="296" cy="124" r="5" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Category ledger sheet: the primary conversion path.               */}
      {/* ------------------------------------------------------------------ */}
      {/* One white sheet overlapping the navy band (-mt pulls it up over
          the band's extra bottom padding). The 21 categories are cells in
          a hairline-divided grid: each cell draws its right and bottom
          rule, and the ul's -1px margins push the outermost rules under
          the sheet border (cropped by overflow-hidden), so only internal
          hairlines remain regardless of the column count. */}
      <section className="relative z-10 -mt-14 sm:-mt-16 mb-4 overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        {/* Sheet header: quiet uppercase label on its own hairline row. */}
        <h2 className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-mute sm:px-5">
          {t("categoriesTitle")}
        </h2>
        <ul className="-mr-px -mb-px grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug} className="border-r border-b border-line">
              <Link
                href={`/category/${slug}`}
                className="group flex h-full items-center justify-between gap-2 px-4 py-4 text-sm
                           font-medium text-ink transition-colors hover:bg-brand-tint sm:px-5 sm:py-5"
              >
                {getCategoryLabel(slug, locale)}
                {/* Directional chevron: faint at rest, teal and nudged
                    right on hover. Geometry only, no text. */}
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-faint transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 3l5 5-5 5" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
