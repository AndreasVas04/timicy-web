/**
 * Custom 404 page for locale-prefixed routes.
 *
 * Rendered whenever notFound() is called within the [locale] layout
 * subtree (e.g. invalid category slugs, missing product IDs). The page
 * is styled to match the site's design tokens and is fully localized
 * via the "notFound" i18n namespace.
 *
 * Uses the synchronous useTranslations hook (not the async
 * getTranslations) because the not-found render path does not inherit
 * the server request locale set by setRequestLocale() in the layout.
 * useTranslations resolves the locale from the NextIntlClientProvider
 * context in the parent layout, which always carries the correct
 * URL-segment locale.
 *
 * NOTE: This file handles 404s that occur inside the [locale] segment.
 * A separate root-level catch-all (src/app/not-found.tsx) covers
 * unmatched paths that fall outside the locale middleware entirely.
 */

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="flex flex-1 items-center justify-center py-24 px-4">
      {/* Centered card with surface background, matching the site's card style. */}
      <div className="max-w-md w-full text-center bg-surface border border-line rounded-xl p-8 shadow-sm">
        {/* Large 404 indicator in muted text. */}
        <p className="text-6xl font-bold text-gray-200 mb-4 font-heading">404</p>

        {/* Localized heading in ink color with the heading font. */}
        <h1 className="text-2xl font-bold text-ink font-heading mb-3">
          {t("title")}
        </h1>

        {/* Localized explanation text. */}
        <p className="text-gray-600 mb-6">
          {t("body")}
        </p>

        {/* Link back to homepage, styled as a brand-colored button. */}
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors"
        >
          {t("backHome")}
        </Link>
      </div>
    </div>
  );
}
