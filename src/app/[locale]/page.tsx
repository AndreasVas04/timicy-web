import { setRequestLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { CATEGORY_SLUGS, getCategoryLabel } from "@/lib/categories";

/**
 * Homepage — server-rendered hero with a title, tagline, and a grid of
 * category links for browsing. Search lives in the site header (HeaderSearch)
 * so it is available on every page including this one.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tc = await getTranslations("category");

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <p className="max-w-lg text-gray-600">{t("tagline")}</p>

      {/* Category grid — links to all 21 category listing pages */}
      <section className="w-full max-w-3xl mt-8">
        <h2 className="text-xl font-semibold mb-4">{tc("browseCategories")}</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATEGORY_SLUGS.map((slug) => (
            <li key={slug}>
              <Link
                href={`/category/${slug}`}
                className="block px-4 py-3 border border-gray-200 rounded-lg text-sm font-medium
                           text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {getCategoryLabel(slug, locale)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
