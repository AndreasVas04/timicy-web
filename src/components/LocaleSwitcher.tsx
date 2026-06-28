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
    router.replace(pathname, { locale: otherLocale });
  }

  return (
    <button
      onClick={handleSwitch}
      className="text-sm font-medium text-gray-600 hover:text-gray-900"
    >
      {label}
    </button>
  );
}
