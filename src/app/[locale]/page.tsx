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
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <p className="max-w-lg text-gray-600">{t("tagline")}</p>

      {/* Category grid — links to all 21 category listing pages */}
      <section className="w-full max-w-3xl mt-8">
        <h2 className="text-xl font-semibold mb-4">{tc("browseCategories")}</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug}>
              <Link
                href={`/category/${slug}`}
                className="block px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium
                           text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
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
