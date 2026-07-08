/**
 * "How it works" / about page.
 *
 * Renders the localized about content from src/content/legal/about.ts.
 * This page has a richer structure than privacy/terms: an intro section,
 * a grid of store-name chips, feature-block cards, and an outro with a
 * contact email link.
 *
 * Metadata follows the same structural pattern as the homepage: localized
 * title, description, canonical URL, hreflang alternates, and OpenGraph/
 * Twitter cards using the shared OG helpers.
 */

import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";
import about from "@/content/legal/about";
import { LegalPageHeader } from "@/components/LegalPageShell";

/* -------------------------------------------------------------------------- */
/*  Types for async params (Next.js 15 App Router convention)                 */
/* -------------------------------------------------------------------------- */

type PageProps = {
  params: Promise<{ locale: string }>;
};

/* -------------------------------------------------------------------------- */
/*  Metadata (title, description, canonical, hreflang, OG, Twitter)          */
/* -------------------------------------------------------------------------- */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const content = about[locale] ?? about.el;
  const title = `${content.title} | TimiCY`;
  const description =
    locale === "en"
      ? "How TimiCY works: nightly price collection from six Cypriot stores, neutral ranking, and free price alerts."
      : "Πώς λειτουργεί το TimiCY: νυχτερινή συλλογή τιμών από έξι κυπριακά καταστήματα, ουδέτερη κατάταξη και δωρεάν ειδοποιήσεις τιμών.";

  const selfUrl = `/${locale}/about`;

  /* hreflang alternates for every supported locale.
     x-default points to the Greek (primary) version. */
  const languages: Record<string, string> = { "x-default": "/el/about" };
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}/about`;
  }

  return {
    title,
    description,
    alternates: { canonical: selfUrl, languages },
    openGraph: {
      title,
      description,
      url: selfUrl,
      siteName: "TimiCY",
      locale: OG_LOCALE[locale] ?? "el_CY",
      type: "website",
      images: [OG_FALLBACK_IMAGE],
    },
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

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;

  /* Enable static rendering for this locale. */
  setRequestLocale(locale);

  /* Pick the content for the current locale, falling back to Greek. */
  const content = about[locale] ?? about.el;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      {/* Shared header treatment: title + horizontal rule with spacing.
          The about page has no "last updated" line. */}
      <LegalPageHeader title={content.title} />

      {/* Body card: white surface matching the site's card style. */}
      <div className="bg-surface border border-line rounded-xl p-6 sm:p-10">
        {/* Intro paragraphs with relaxed leading. */}
        {content.intro.map((para, idx) => (
          <p
            key={idx}
            className={`text-gray-600 leading-relaxed ${idx > 0 ? "mt-3" : ""}`}
          >
            {para}
          </p>
        ))}

        {/* Store chips: responsive grid of bordered chips showing the six
            stores that TimiCY tracks. Slightly taller with hover accent. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-6">
          {content.stores.map((store) => (
            <span
              key={store}
              className="flex items-center justify-center px-3 py-3 bg-surface border border-line rounded-lg text-sm font-medium text-ink text-center hover:border-brand transition-colors"
            >
              {store}
            </span>
          ))}
        </div>

        {/* Feature blocks: responsive card grid (1 col mobile, 3 cols
            desktop). items-stretch + h-full ensure equal-height cards. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 items-stretch">
          {content.blocks.map((block, idx) => (
            <div
              key={idx}
              className="border border-line rounded-lg p-4 h-full"
            >
              <h2 className="text-base font-semibold text-ink font-heading mb-2">
                {block.heading}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {block.body}
              </p>
            </div>
          ))}
        </div>

        {/* Outro paragraph with contact email link. */}
        <p className="text-gray-600 leading-relaxed mt-8">
          {/* Split the outro around the email address so it can be rendered
              as a clickable mailto link. If the email is not in the string,
              render the paragraph as-is. */}
          {content.outro.includes("contact@timicy.com") ? (
            <>
              {content.outro.split("contact@timicy.com")[0]}
              <a
                href="mailto:contact@timicy.com"
                className="text-brand hover:text-brand-hover transition-colors"
              >
                contact@timicy.com
              </a>
              {content.outro.split("contact@timicy.com")[1]}
            </>
          ) : (
            content.outro
          )}
        </p>
      </div>
    </div>
  );
}
