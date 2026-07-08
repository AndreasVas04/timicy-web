/**
 * Terms of use page.
 *
 * Renders the localized terms from src/content/legal/terms.ts using the
 * shared LegalPageShell component for consistent styling across all
 * legal pages.
 *
 * Metadata follows the same structural pattern as the homepage: localized
 * title, description, canonical URL, hreflang alternates, and OpenGraph/
 * Twitter cards using the shared OG helpers.
 */

import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";
import terms from "@/content/legal/terms";
import LegalPageShell from "@/components/LegalPageShell";

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

  const content = terms[locale] ?? terms.el;
  const title = `${content.title} | TimiCY`;
  const description =
    locale === "en"
      ? "Terms of use for TimiCY, the free electronics price comparison service in Cyprus."
      : "Όροι χρήσης του TimiCY, της δωρεάν υπηρεσίας σύγκρισης τιμών ηλεκτρονικών στην Κύπρο.";

  const selfUrl = `/${locale}/terms`;

  /* hreflang alternates for every supported locale.
     x-default points to the Greek (primary) version. */
  const languages: Record<string, string> = { "x-default": "/el/terms" };
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}/terms`;
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

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;

  /* Enable static rendering for this locale. */
  setRequestLocale(locale);

  /* Pick the content for the current locale, falling back to Greek. */
  const content = terms[locale] ?? terms.el;

  return <LegalPageShell content={content} />;
}
