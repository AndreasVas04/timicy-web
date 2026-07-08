"use client";

/**
 * Global error boundary for locale-prefixed routes.
 *
 * Catches unhandled runtime errors within the [locale] subtree and
 * presents a friendly recovery UI with a retry button.
 *
 * IMPORTANT: This component may render when the next-intl provider has
 * failed or is unavailable (e.g. message loading failure). For this
 * reason, all user-facing strings are hardcoded here rather than loaded
 * from the i18n message files. The locale is derived from the URL
 * pathname so the correct language is shown.
 */

import { usePathname } from "next/navigation";

/**
 * Hardcoded error page strings keyed by locale.
 * Kept inline because the i18n provider may not be available when this
 * error boundary renders — see module docstring above.
 */
const COPY: Record<string, { title: string; retry: string }> = {
  el: { title: "Κάτι πήγε στραβά", retry: "Δοκίμασε ξανά" },
  en: { title: "Something went wrong", retry: "Try again" },
};

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  /*
   * Extract the locale from the URL pathname. The [locale] segment is
   * always the first path component (e.g. "/el/category/..." → "el").
   * Falls back to Greek ("el") if the pathname is unexpected.
   */
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] === "en" ? "en" : "el";
  const copy = COPY[locale] ?? COPY.el;

  return (
    <div className="flex flex-1 items-center justify-center py-24 px-4">
      {/* Centered sheet matching the site's 404 page style. */}
      <div className="max-w-md w-full text-center bg-surface border border-line rounded-lg p-8 shadow-sm">
        {/* Muted exclamation indicator in the faint ink wash. */}
        <p className="text-7xl font-extrabold font-heading text-ink/10 mb-4 select-none" aria-hidden="true">!</p>

        {/* Error heading — ink color, heading font. */}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink font-heading mb-3">
          {copy.title}
        </h1>

        {/* Retry button — calls Next.js reset() to re-render the segment. */}
        <button
          onClick={reset}
          className="inline-block px-6 py-2.5 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink-deep transition-colors"
        >
          {copy.retry}
        </button>
      </div>
    </div>
  );
}
