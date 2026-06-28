import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale, getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import "@/app/globals.css";

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
  const t = await getTranslations("nav");

  return (
    <html lang={locale}>
      <body className="min-h-screen flex flex-col bg-white text-gray-900">
        <NextIntlClientProvider messages={messages}>
          {/* Site header */}
          <header className="border-b border-gray-200">
            <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
              <span className="text-xl font-bold tracking-tight">
                {t("brand")}
              </span>
              <LocaleSwitcher />
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
 */
async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
      {t("text")}
    </footer>
  );
}

/**
 * Generate static params for both locales so Next.js can pre-render them.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
