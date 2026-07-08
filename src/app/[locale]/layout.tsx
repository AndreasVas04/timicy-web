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
      {/* Default text color is the brand navy: body copy shares the same
          ink as headings and prices, with mute/faint tokens for hierarchy. */}
      <body className="min-h-screen flex flex-col bg-page text-ink">
        <NextIntlClientProvider messages={messages}>
          {/* Site header — sticky so search and navigation stay reachable
              while scrolling. `sticky` is a positioned box, so the mobile
              search panel can still be absolutely positioned below the
              header bar (previously done via `relative`); z-40 keeps the
              bar above page content (the hero band, product images).
              The 3px teal strip along the very top edge is the brand's
              "index line": a small constant marker on every page. */}
          <header className="sticky top-0 z-40 bg-surface border-b border-line">
            <div aria-hidden="true" className="h-[3px] bg-brand" />
            <div className="mx-auto max-w-6xl flex items-center justify-between px-4 py-3.5">
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
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
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
 * The closing "ledger band": deep navy with the faint graph-paper grid
 * shared by the hero and the price plate, so the page opens and closes
 * on the same identity surface. Content is unchanged:
 * Row 0: a small decorative step-line (the price-drop motif).
 * Row 1: navigation links (about, terms, privacy) separated by
 *   middle-dot characters, muted ink-soft brightening to white on hover.
 * Row 2: copyright line in the same muted tone.
 */
async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="bg-ink-deep grid-paper py-12 text-center text-sm text-ink-soft">
      {/* Decorative step-line motif: price holds, drops, settles on a
          teal dot. Purely ornamental, mirrors the homepage hero. */}
      <svg
        aria-hidden="true"
        className="mx-auto mb-6 text-brand"
        width="120"
        height="28"
        viewBox="0 0 120 28"
        fill="none"
      >
        <path
          d="M2 6 H40 V14 H76 V22 H110"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <circle cx="110" cy="22" r="3.5" fill="currentColor" />
      </svg>

      {/* Row 1: navigation links separated by middle-dot. */}
      <nav className="mx-auto max-w-6xl px-4 flex items-center justify-center gap-2 flex-wrap">
        <Link href="/about" className="hover:text-white transition-colors">
          {t("about")}
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link href="/terms" className="hover:text-white transition-colors">
          {t("terms")}
        </Link>
        <span aria-hidden="true">&middot;</span>
        <Link href="/privacy" className="hover:text-white transition-colors">
          {t("privacy")}
        </Link>
      </nav>
      {/* Row 2: copyright line. */}
      <p className="mt-4 text-ink-soft/80">{t("copyright")}</p>
    </footer>
  );
}

/**
 * Generate static params for both locales so Next.js can pre-render them.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
