import { setRequestLocale, getTranslations } from "next-intl/server";

/**
 * Homepage — server-rendered hero with a title, tagline, and placeholder
 * search input.  No data fetching; this is a static landing page.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <p className="max-w-lg text-gray-600">{t("tagline")}</p>

      {/* Visual-only search input — not wired to any search logic yet.
          Search functionality will be implemented in a later task. */}
      <input
        type="text"
        placeholder={t("searchPlaceholder")}
        className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-3 text-base
                   focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        readOnly
      />
    </div>
  );
}
