"use client";

/**
 * Contextual back link for the product page.
 *
 * Renders a quiet left-arrow + label link above the product header.
 * Click behavior adapts to how the visitor arrived:
 *
 * - If the visitor has navigated within the site during this session
 *   (detected via a sessionStorage flag set by NavigationTracker),
 *   it calls router.back() so the browser returns to the exact
 *   previous URL, preserving query parameters (?sort=, ?page=) and
 *   scroll position.
 *
 * - For direct visitors (typed URL, external link, bookmarks) where
 *   no in-site navigation has occurred, it navigates to the product's
 *   category listing page as a sensible fallback.
 *
 * The no-JS fallback (the <a> href) always points to the category page.
 */

import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { NAV_FLAG_KEY } from "./NavigationTracker";

export function BackLink({ categorySlug }: { categorySlug: string }) {
  const t = useTranslations("product");
  const router = useRouter();

  /**
   * Handle click: go back if in-site history exists (sessionStorage
   * flag), otherwise navigate to the category page.
   */
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();

    // Check the sessionStorage flag set by NavigationTracker.
    // Wrapped in try/catch because sessionStorage can throw in
    // private browsing modes or when storage is disabled.
    let hasInSiteHistory = false;
    try {
      hasInSiteHistory = sessionStorage.getItem(NAV_FLAG_KEY) === "1";
    } catch {
      // Storage unavailable — fall through to category fallback.
    }

    if (hasInSiteHistory) {
      router.back();
    } else {
      // Fallback for direct visitors: navigate to the product's
      // category listing page.
      router.push(`/category/${categorySlug}`);
    }
  }

  return (
    <Link
      href={`/category/${categorySlug}`}
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm text-mute hover:text-brand transition-colors mb-4"
    >
      {/* Left-pointing chevron arrow, matching the icon style used
          elsewhere in the header (CategoriesDropdown chevron). */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {t("backLabel")}
    </Link>
  );
}
