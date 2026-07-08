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
      <div className="max-w-md mx-auto my-16 px-4">
        {/* Centered sheet matching the site's 404/error page style. */}
        <div className="text-center bg-surface border border-line rounded-lg p-8 shadow-sm">
          <h1 className="text-xl font-extrabold tracking-tight text-ink font-heading mb-3">
            {t("unsubscribeTitle")}
          </h1>
          <p className="text-mute">{t("invalidToken")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      {/* Centered sheet matching the site's 404/error page style. */}
      <div className="text-center bg-surface border border-line rounded-lg p-8 shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-ink font-heading mb-3">
          {t("unsubscribeTitle")}
        </h1>
        <p className="text-mute mb-6">{t("unsubscribeDescription")}</p>
        {/* Client component handles the POST and shows result inline */}
        <UnsubscribeButton token={token} />
      </div>
    </div>
  );
}
