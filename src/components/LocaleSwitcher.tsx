"use client";

/**
 * Minimal locale toggle — switches between EL and EN while preserving
 * the current page path.  Renders as a simple text link.
 */

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  // Determine the other locale to switch to.
  const otherLocale = locale === "el" ? "en" : "el";
  const label = otherLocale === "en" ? "EN" : "EL";

  function handleSwitch() {
    // usePathname (next-intl) returns the path WITHOUT the query string, so a
    // plain replace(pathname) silently drops ?q= / ?sort= / ?page= when the
    // user switches language. Read the live query string at click time via
    // window.location (safe: click handlers only run in the browser). We
    // deliberately avoid the useSearchParams hook here — in Next 15 it forces
    // a Suspense boundary / client-side deopt on statically rendered pages,
    // which is a heavy cost for a value we only need on click.
    router.replace(`${pathname}${window.location.search}`, { locale: otherLocale });
  }

  return (
    <button
      onClick={handleSwitch}
      className="rounded-lg border border-line px-2.5 py-1 text-sm font-medium text-gray-700 hover:border-brand hover:text-brand transition-colors"
    >
      {label}
    </button>
  );
}
