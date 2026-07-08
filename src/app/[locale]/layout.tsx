import { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { HeaderSearch } from "@/components/HeaderSearch";
import { CategoriesDropdown } from "@/components/CategoriesDropdown";
import { Inter, Manrope } from "next/font/google";
import "@/app/globals.css";

// Body font. `variable` exposes it as the --font-inter CSS variable,
// which globals.css maps to --font-sans. `display: "swap"` avoids blocking text render.
const inter = Inter({
  subsets: ["latin", "greek"],
  variable: "--font-inter",
  display: "swap",
});

// Heading / wordmark font. Exposed as --font-manrope, mapped to --font-heading in globals.css.
const manrope = Manrope({
  subsets: ["latin", "greek"],
  variable: "--font-manrope",
  display: "swap",
});

import { SITE_URL } from "@/lib/site-url";

/**
 * Indexing gate — when ALLOW_INDEXING is not exactly "true", the metadata
 * object includes a robots directive that tells search engines not to index
 * or follow links on any page. This works alongside the X-Robots-Tag header
 * (next.config.ts) and robots.txt (robots.ts) for defence-in-depth.
 */
const allowIndexing = process.env.ALLOW_INDEXING === "true";

/**
 * Base metadata for the entire site. metadataBase is used by Next.js to resolve
 * relative URLs in metadata (canonical, Open Graph, etc.) into absolute URLs.
 * Importing SITE_URL from site-url.ts ensures a single source of truth and
 * throws immediately if the env var is missing (no silent localhost fallback).
 *
 * When indexing is disallowed, a robots { index: false, follow: false }
 * directive is spread into the object so Next.js renders the appropriate
 * <meta name="robots"> tag in the <head>.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Default title fallback — any page without its own generateMetadata will
  // render "TimiCY" as the <title>. The `template: "%s"` format string
  // passes page-level titles through unchanged (no wrapping suffix).
  title: { default: "TimiCY", template: "%s" },
  ...(allowIndexing ? {} : { robots: { index: false, follow: false } }),
};

/**
 * Root layout for all locale-prefixed routes.
 *
 * Validates the locale from the URL segment, sets it for static rendering,
 * and wraps children in the next-intl provider so both server and client
 * components can access translations.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Reject unknown locales with a 404.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering for this locale.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen flex flex-col bg-page text-gray-900">
        <NextIntlClientProvider messages={messages}>
          {/* Site header — relative positioning so the mobile search panel
              can be absolutely positioned below the header bar. */}
          <header className="relative bg-surface border-b border-line">
            <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
              {/* Logo links to the homepage. The source image is a
                  471×120 truecolor+alpha PNG — exactly 3× the displayed
                  157×40 size (same ≈ 3.94 aspect ratio) — so the logo
                  stays sharp on high-DPI / Retina screens. Displayed at
                  157×40 to fit the header bar. `priority` is set because
                  the logo is above-the-fold on every page (LCP). */}
              <Link href="/" className="shrink-0">
                <Image
                  src="/TimiCY_logo.png"
                  alt="TimiCY"
                  width={157}
                  height={40}
                  priority
                />
              </Link>

              {/* Persistent search — visible inline on desktop, toggle on mobile.
                  HeaderSearch is a client component that wraps SearchAutocomplete. */}
              <HeaderSearch />

              {/* Right-side navigation: categories dropdown, a hairline divider, then the locale
                  switcher. The divider gives the two controls clear separation so they no longer
                  feel cramped together. */}
              <div className="flex items-center gap-4 shrink-0">
                <CategoriesDropdown />
                <span aria-hidden="true" className="h-5 w-px bg-line"></span>
                <LocaleSwitcher />
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">
            {children}
          </main>

          {/* Site footer */}
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

/**
 * Footer component — server-rendered, uses translations.
 *
 * Two-row layout:
 * Row 1: navigation links (about, terms, privacy, contact) separated by
 *   middle-dot characters. Internal links use the locale-aware Link
 *   component; the contact link is a plain mailto anchor.
 * Row 2: copyright line with the year and site tagline.
 */
async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="border-t border-line py-6 text-center text-sm text-gray-500">
      {/* Row 1: navigation links separated by middle-dot. */}
      <nav className="flex items-center justify-center gap-2 flex-wrap">
        <Link href="/about" className="hover:text-brand transition-colors">
          {t("about")}
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link href="/terms" className="hover:text-brand transition-colors">
          {t("terms")}
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link href="/privacy" className="hover:text-brand transition-colors">
          {t("privacy")}
        </Link>
        <span aria-hidden="true">&middot;</span>
        <a
          href="mailto:contact@timicy.com"
          className="hover:text-brand transition-colors"
        >
          {t("contact")}
        </a>
      </nav>
      {/* Row 2: copyright and tagline. */}
      <p className="mt-2">{t("copyright")}</p>
    </footer>
  );
}

/**
 * Generate static params for both locales so Next.js can pre-render them.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
