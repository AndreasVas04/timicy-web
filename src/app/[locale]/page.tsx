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
 * Homepage — server-rendered hero with a title, tagline, and a grid of
 * category links for browsing. Search lives in the site header (HeaderSearch)
 * so it is available on every page including this one.
 */
export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tc = await getTranslations("category");

  return (
    <div className="flex flex-col items-center py-12 sm:py-16 text-center">
      {/* Hero: one strong statement + trust strip. No duplicate search box —
          the persistent header search is the single search entry point. */}
      <h1 className="text-3xl sm:text-5xl font-bold text-ink max-w-2xl leading-tight">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-lg text-gray-600">{t("tagline")}</p>

      {/* Category grid: the primary conversion path from the homepage. */}
      <section className="w-full max-w-4xl mt-10">
        <h2 className="text-xl font-semibold text-ink mb-5">{tc("browseCategories")}</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug}>
              <Link
                href={`/category/${slug}`}
                className="flex items-center justify-center h-full px-4 py-3.5 bg-surface border border-line rounded-xl
                           text-sm font-medium text-gray-700 transition-all duration-200
                           hover:border-brand hover:text-brand hover:shadow-sm"
              >
                {getCategoryLabel(slug, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
