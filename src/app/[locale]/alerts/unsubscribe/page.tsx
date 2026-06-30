import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import UnsubscribeButton from "./UnsubscribeButton";

/**
 * Prevent search engines from indexing unsubscribe pages.
 */
export const metadata: Metadata = {
  robots: { index: false },
};

/* -------------------------------------------------------------------------- */
/*  Types for async params/searchParams (Next.js 15 App Router convention)    */
/* -------------------------------------------------------------------------- */

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

/* -------------------------------------------------------------------------- */
/*  GET /[locale]/alerts/unsubscribe?token=...                                */
/*  Server Component that renders the unsubscribe page.                       */
/*  Does NOT delete anything on page load — the user must click the button.   */
/* -------------------------------------------------------------------------- */

export default async function UnsubscribePage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { token } = await searchParams;

  setRequestLocale(locale);
  const t = await getTranslations("alerts");

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="text-xl font-bold mb-4">{t("unsubscribeTitle")}</h1>
        <p className="text-gray-600">{t("invalidToken")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16 text-center">
      <h1 className="text-xl font-bold mb-4">{t("unsubscribeTitle")}</h1>
      <p className="text-gray-600 mb-6">{t("unsubscribeDescription")}</p>
      {/* Client component handles the POST and shows result inline */}
      <UnsubscribeButton token={token} />
    </div>
  );
}
