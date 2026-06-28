/**
 * Locale routing configuration for next-intl.
 *
 * Defines supported locales, the default locale, and the URL prefix strategy.
 * "always" means every route is prefixed with the locale (e.g. /el/..., /en/...).
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["el", "en"],
  defaultLocale: "el",
  localePrefix: "always",
});
