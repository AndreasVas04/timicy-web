/**
 * Privacy policy page.
 *
 * Renders the localized privacy policy from src/content/legal/privacy.ts
 * using the shared LegalPageShell component for consistent styling across
 * all legal pages.
 *
 * Metadata follows the same structural pattern as the homepage: localized
 * title, description, canonical URL, hreflang alternates, and OpenGraph/
 * Twitter cards using the shared OG helpers.
 */

import { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { OG_FALLBACK_IMAGE, OG_LOCALE } from "@/lib/og";
import privacy from "@/content/legal/privacy";
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

  const content = privacy[locale] ?? privacy.el;
  const title = `${content.title} | TimiCY`;
  const description =
    locale === "en"
      ? "How TimiCY handles your data, what we collect, and your rights under the GDPR."
      : "Πώς το TimiCY χειρίζεται τα δεδομένα σου, τι συλλέγουμε και τα δικαιώματά σου βάσει GDPR.";

  const selfUrl = `/${locale}/privacy`;

  /* hreflang alternates for every supported locale.
     x-default points to the Greek (primary) version. */
  const languages: Record<string, string> = { "x-default": "/el/privacy" };
  for (const loc of routing.locales) {
    languages[loc] = `/${loc}/privacy`;
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

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;

  /* Enable static rendering for this locale. */
  setRequestLocale(locale);

  /* Pick the content for the current locale, falling back to Greek. */
  const content = privacy[locale] ?? privacy.el;

  return <LegalPageShell content={content} />;
}
