"use client";

/**
 * Responsive header search wrapper.
 *
 * Desktop (>= md): renders the search input inline, always visible.
 * Mobile (< md): shows a magnifier icon button; tapping it reveals the
 * search bar in a row below the header. Escape or navigation hides it.
 *
 * The actual search logic lives entirely in SearchAutocomplete — this
 * wrapper only handles the responsive show/hide toggle.
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { SearchAutocomplete } from "./SearchAutocomplete";

export function HeaderSearch() {
  const t = useTranslations("nav");
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile search panel when the user navigates to a new page.
  // Tracked via state (React-recommended "derived state" pattern) so we
  // can call setState during render without violating hook rules.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  // Close on Escape key while mobile search is open.
  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop: always-visible compact search input */}
      <div className="hidden md:block flex-1 max-w-md mx-4">
        <SearchAutocomplete instanceId="header" compact />
      </div>

      {/* Mobile: toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label={t("searchToggle")}
        className="md:hidden p-1.5 text-gray-600 hover:text-brand transition-colors"
      >
        {/* Magnifier icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
          />
        </svg>
      </button>

      {/* Mobile: expandable search row below the header bar */}
      {mobileOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-line px-4 py-2 z-40">
          <SearchAutocomplete instanceId="header-mobile" compact />
        </div>
      )}
    </>
  );
}
