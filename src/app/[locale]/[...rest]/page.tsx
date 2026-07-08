/**
 * Catch-all route for unmatched paths within the [locale] segment.
 *
 * Without this file, a request like /en/asdf does not enter the [locale]
 * layout at all — Next.js bubbles the 404 up to the root not-found page,
 * which renders in Greek regardless of the URL locale. This catch-all
 * ensures the locale layout runs first (calling setRequestLocale and
 * wrapping in NextIntlClientProvider), then triggers notFound() so the
 * localized [locale]/not-found.tsx is rendered with the correct language.
 *
 * See: https://next-intl.dev/docs/environments/error-files
 */

import { notFound } from "next/navigation";

export default function CatchAllPage() {
  notFound();
}
