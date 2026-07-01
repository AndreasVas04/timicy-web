"use client";

/**
 * Categories dropdown for the site header.
 *
 * Renders a button that toggles a dropdown listing all 21 product categories
 * as links. A dropdown was chosen over a simple anchor link to the homepage
 * categories section because it provides direct navigation to any category
 * from any page without requiring a homepage round-trip.
 *
 * Keyboard accessible: Escape closes the dropdown, click-outside closes it.
 * Category labels come from src/lib/categories.ts (the single source of
 * truth for localized category names).
 */

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CATEGORY_SLUGS, getCategoryLabel } from "@/lib/categories";

export function CategoriesDropdown() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close dropdown on Escape.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-brand transition-colors"
      >
        {t("categories")}
        {/* Chevron indicates a dropdown; rotates 180deg while the menu is open. */}
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2} aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-56 max-h-80 overflow-y-auto
                     rounded-lg border border-line bg-white shadow-lg z-50"
        >
          <ul role="list" className="py-1">
            {CATEGORY_SLUGS.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/category/${slug}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-page
                             hover:text-brand transition-colors"
                >
                  {getCategoryLabel(slug, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
