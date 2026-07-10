"use client";

/**
 * FilterPanel -- sidebar filter controls for category pages.
 *
 * Owns the full category page layout: header row (heading + sort),
 * filter sections (sidebar on desktop, full-screen panel on mobile),
 * and the product content area (passed as children).
 *
 * Layout:
 *   Desktop (lg+): 250 px left sidebar alongside the product grid.
 *   Mobile (below lg): a floating button pinned bottom-right opens
 *   a full-screen filter panel overlaying the page.
 *
 * Apply model (batch): all filter changes (brands, price, stock)
 * are held in local pending state until the user taps Apply, which
 * commits them in a single navigation. Clear is immediate and
 * resets + navigates in one tap. Sort is also immediate (not batched).
 *
 * Two DOM instances of the filter sections exist -- one inside the
 * mobile panel (idPrefix "m-") and one in the desktop sidebar
 * (idPrefix "d-") -- so that both breakpoints can coexist without
 * duplicate element ids.
 *
 * All navigation URLs go through buildCategoryUrl from
 * src/lib/filter-params.ts. Every filter change resets pagination
 * to page 1 and preserves the current sort order.
 */

import { type ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  buildCategoryUrl,
  brandToSlug,
  type FilterParams,
} from "@/lib/filter-params";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

/** Number of brands shown before the show-more expander appears. */
const BRAND_VISIBLE_COUNT = 10;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Pre-translated label strings passed down from the server page. */
type FilterLabels = {
  filtersTitle: string;
  filterBrand: string;
  filterBrandSearch: string;
  filterPrice: string;
  filterMin: string;
  filterMax: string;
  filterApply: string;
  filterClear: string;
  showUnavailable: string;
  showMore: string;
  showLess: string;
  filtersClose: string;
};

/* -------------------------------------------------------------------------- */
/*  Helpers (pure functions, used by the component)                           */
/* -------------------------------------------------------------------------- */

/**
 * Parse a price input string to a non-negative integer, or null.
 * Mirrors the validation applied when the user taps Apply.
 */
function parsePriceStr(s: string): number | null {
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Serialize applied filter values into a stable string key.
 * Used by the resync effect to detect when the URL-derived
 * filters change (browser back/forward, Clear, external nav)
 * so the pending state can be reset.
 */
function appliedFilterKey(f: FilterParams): string {
  return [
    [...f.brands].sort().join(","),
    f.min,
    f.max,
    f.stock,
  ].join("|");
}

/**
 * Count active filter groups for the floating-button badge.
 * Brands count as one group regardless of how many are selected,
 * price range counts as one, and stock counts as one.
 */
function countActiveFilters(filters: FilterParams): number {
  let count = 0;
  if (filters.brands.length > 0) count += 1;
  if (filters.min !== null || filters.max !== null) count += 1;
  if (filters.stock === "all") count += 1;
  return count;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function FilterPanel({
  category,
  sort,
  filters,
  brands,
  labels,
  heading,
  sortSlot,
  children,
}: {
  /** The current category slug (e.g. "headphones"). */
  category: string;
  /** The current sort key, preserved across all filter changes. */
  sort: string;
  /** The currently active filter parameters parsed from the URL. */
  filters: FilterParams;
  /** Brand names for this category, ordered by product count. */
  brands: string[];
  /** Pre-translated UI label strings from the category namespace. */
  labels: FilterLabels;
  /** The page heading element, placed in the header row. */
  heading: ReactNode;
  /** The sort dropdown, placed in the header controls row. */
  sortSlot: ReactNode;
  /** Product grid, empty state, and pagination. */
  children: ReactNode;
}) {
  const router = useRouter();

  /* ---- Local UI state --------------------------------------------------- */

  /** Whether the mobile full-screen panel is open. */
  const [isOpen, setIsOpen] = useState(false);

  /** Whether the brand list is expanded past the initial limit. */
  const [brandsExpanded, setBrandsExpanded] = useState(false);

  /** Client-side search term for narrowing the brand checkbox list. */
  const [brandSearch, setBrandSearch] = useState("");

  /** Pending filter state. All filter inputs write here; nothing
   *  navigates until the user taps Apply. Price fields are stored
   *  as strings for controlled input binding; parsed to numbers
   *  on Apply. Initialized from the URL-derived `filters` prop. */
  const [pending, setPending] = useState(() => ({
    brands: [...filters.brands],
    min: filters.min !== null ? String(filters.min) : "",
    max: filters.max !== null ? String(filters.max) : "",
    stock: filters.stock,
  }));

  /* ---- Refs for focus management --------------------------------------- */

  /** The floating filter button; receives focus when the panel closes. */
  const triggerRef = useRef<HTMLButtonElement>(null);

  /** The panel close button; receives focus when the panel opens. */
  const closeRef = useRef<HTMLButtonElement>(null);

  /* ---- Panel open/close ------------------------------------------------ */

  /** Close the mobile filter panel and return focus to the trigger. */
  const closePanel = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  /* ---- Side effects ---------------------------------------------------- */

  /** Scroll lock: prevent body scrolling while the overlay is open.
   *  Saves the previous overflow value so it can be restored on
   *  close or unmount without clobbering unrelated inline styles. */
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  /** Focus the close button when the panel opens so keyboard and
   *  screen-reader users land inside the dialog immediately. */
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        closeRef.current?.focus();
      });
    }
  }, [isOpen]);

  /** Close the panel on Escape key. */
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePanel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closePanel]);

  /** Resync pending state when the applied filters change (browser
   *  back/forward, Clear navigation, or any external URL change).
   *  Uses the React-recommended "adjusting state during rendering"
   *  pattern: compare a serialized key of the applied filters to
   *  a tracked previous key, and reset pending synchronously when
   *  it differs. This avoids useEffect and the cascading-render
   *  lint warning while still being deterministic. */
  const currentAppliedKey = appliedFilterKey(filters);
  const [prevAppliedKey, setPrevAppliedKey] = useState(currentAppliedKey);
  if (prevAppliedKey !== currentAppliedKey) {
    setPrevAppliedKey(currentAppliedKey);
    setPending({
      brands: [...filters.brands],
      min: filters.min !== null ? String(filters.min) : "",
      max: filters.max !== null ? String(filters.max) : "",
      stock: filters.stock,
    });
  }

  /* ---- Derived values --------------------------------------------------- */

  /** Set of currently pending brand slugs for checkbox lookup. */
  const pendingBrandSlugs = new Set(pending.brands);

  /** Brands filtered by the local search term (case-insensitive). */
  const filteredBrands = brandSearch
    ? brands.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase())
      )
    : brands;

  /** When searching, show all matches; otherwise respect the expander. */
  const visibleBrands =
    brandSearch || brandsExpanded
      ? filteredBrands
      : filteredBrands.slice(0, BRAND_VISIBLE_COUNT);

  /** The expander is only shown when there is no search term and
   *  the full list exceeds the visible-count threshold. */
  const needsExpander =
    !brandSearch && filteredBrands.length > BRAND_VISIBLE_COUNT;

  /** Whether the pending state differs from the applied filters.
   *  Controls the enabled/disabled state of the Apply button so
   *  the user can tell their tap registered even though nothing
   *  navigates until Apply. */
  const isDirty =
    [...pending.brands].sort().join(",") !==
      [...filters.brands].sort().join(",") ||
    parsePriceStr(pending.min) !== filters.min ||
    parsePriceStr(pending.max) !== filters.max ||
    pending.stock !== filters.stock;

  /* ---- Navigation helpers ----------------------------------------------- */

  /**
   * Navigate to a new filter state via buildCategoryUrl.
   * Resets pagination to page 1, preserves sort, recomputes hasFilters.
   */
  function navigateWithFilters(newFilters: Omit<FilterParams, "hasFilters">) {
    const hasFilters =
      newFilters.brands.length > 0 ||
      newFilters.min !== null ||
      newFilters.max !== null ||
      newFilters.stock === "all";

    router.push(
      buildCategoryUrl({
        category,
        sort,
        page: 1,
        filters: { ...newFilters, hasFilters },
      })
    );
  }

  /* ---- Pending-state handlers ------------------------------------------ */

  /** Toggle a brand in pending state (does not navigate). */
  function handleBrandToggle(brand: string) {
    const slug = brandToSlug(brand);
    setPending((p) => {
      const set = new Set(p.brands);
      if (set.has(slug)) set.delete(slug);
      else set.add(slug);
      return { ...p, brands: [...set].sort() };
    });
  }

  /** Toggle the stock filter in pending state (does not navigate). */
  function handleStockToggle() {
    setPending((p) => ({
      ...p,
      stock: p.stock === "all" ? "in" : "all",
    }));
  }

  /** Update the pending min price string (does not navigate). */
  function handleMinChange(value: string) {
    setPending((p) => ({ ...p, min: value }));
  }

  /** Update the pending max price string (does not navigate). */
  function handleMaxChange(value: string) {
    setPending((p) => ({ ...p, max: value }));
  }

  /** Apply all pending filters in a single navigation.
   *  Parses and validates price strings; swaps min/max if inverted
   *  so the user always gets results. Closes the mobile panel so
   *  the user lands back on the filtered results. */
  function handleApply() {
    let min = parsePriceStr(pending.min);
    let max = parsePriceStr(pending.max);
    if (min !== null && max !== null && min > max) {
      [min, max] = [max, min];
      setPending((p) => ({
        ...p,
        min: min !== null ? String(min) : "",
        max: max !== null ? String(max) : "",
      }));
    }
    navigateWithFilters({
      brands: [...pending.brands].sort(),
      min,
      max,
      stock: pending.stock,
    });
    setIsOpen(false);
  }

  /** Clear all filters immediately: resets pending state AND
   *  navigates to the clean category URL in one tap. Closes the
   *  mobile panel so the user sees the cleared results. */
  function handleClear() {
    setBrandSearch("");
    setPending({ brands: [], min: "", max: "", stock: "in" });
    navigateWithFilters({ brands: [], min: null, max: null, stock: "in" });
    setIsOpen(false);
  }

  /* ---- Render helpers -------------------------------------------------- */

  /**
   * Render the filter section controls (brand checkboxes, price
   * inputs, stock toggle). Takes an idPrefix so that the mobile
   * panel ("m-") and desktop sidebar ("d-") instances can coexist
   * without duplicate element ids.
   */
  function renderFilterSections(idPrefix: string) {
    return (
      <>
        {/* -- Brand checkboxes ------------------------------------------- */}
        {brands.length > 0 && (
          <fieldset className="border-b border-line px-4 pt-5 pb-4">
            <legend className="mb-3 text-sm font-semibold text-ink">
              {labels.filterBrand}
            </legend>

            {/* Brand search: filters the checkbox list client-side */}
            <label htmlFor={`${idPrefix}brand-search`} className="sr-only">
              {labels.filterBrandSearch}
            </label>
            <input
              id={`${idPrefix}brand-search`}
              type="text"
              placeholder={labels.filterBrandSearch}
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="mb-2 w-full rounded-md border border-line bg-surface px-2.5 py-1.5
                         text-sm text-ink placeholder:text-faint
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand focus-visible:ring-offset-1"
            />

            {/* Single-column brand checkbox list */}
            <div className="flex flex-col gap-1.5">
              {visibleBrands.map((brand) => {
                const slug = brandToSlug(brand);
                const isChecked = pendingBrandSlugs.has(slug);
                const inputId = `${idPrefix}brand-${slug}`;
                return (
                  <label
                    key={slug}
                    htmlFor={inputId}
                    className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleBrandToggle(brand)}
                      className="h-4 w-4 border-line accent-brand
                                 focus-visible:outline-none focus-visible:ring-2
                                 focus-visible:ring-brand focus-visible:ring-offset-1"
                    />
                    {brand}
                  </label>
                );
              })}
            </div>

            {/* Show more / Show less expander (hidden when searching) */}
            {needsExpander && (
              <button
                type="button"
                onClick={() => setBrandsExpanded(!brandsExpanded)}
                className="mt-2 text-sm font-medium text-brand hover:text-brand-hover
                           rounded focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-brand focus-visible:ring-offset-1"
              >
                {brandsExpanded ? labels.showLess : labels.showMore}
              </button>
            )}
          </fieldset>
        )}

        {/* -- Price range ------------------------------------------------ */}
        <fieldset className="border-b border-line px-4 pt-5 pb-4">
          <legend className="mb-3 text-sm font-semibold text-ink">
            {labels.filterPrice}
          </legend>

          {/* Controlled price inputs bound to pending state */}
          <div className="flex flex-col gap-2">
            <label htmlFor={`${idPrefix}filter-min`} className="sr-only">
              {labels.filterMin}
            </label>
            <input
              id={`${idPrefix}filter-min`}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder={labels.filterMin}
              value={pending.min}
              onChange={(e) => handleMinChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
              className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5
                         text-sm tabular-nums text-ink placeholder:text-faint
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand focus-visible:ring-offset-1"
            />
            <label htmlFor={`${idPrefix}filter-max`} className="sr-only">
              {labels.filterMax}
            </label>
            <input
              id={`${idPrefix}filter-max`}
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder={labels.filterMax}
              value={pending.max}
              onChange={(e) => handleMaxChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
              className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5
                         text-sm tabular-nums text-ink placeholder:text-faint
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand focus-visible:ring-offset-1"
            />
          </div>
        </fieldset>

        {/* -- Availability toggle ---------------------------------------- */}
        <div className="px-4 pt-5 pb-4">
          <label
            htmlFor={`${idPrefix}filter-stock`}
            className="flex cursor-pointer items-center gap-2 text-sm text-ink"
          >
            <input
              id={`${idPrefix}filter-stock`}
              type="checkbox"
              checked={pending.stock === "all"}
              onChange={handleStockToggle}
              className="h-4 w-4 border-line accent-brand
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand focus-visible:ring-offset-1"
            />
            {labels.showUnavailable}
          </label>
        </div>
      </>
    );
  }

  /**
   * Render the Clear + Apply action bar used by both mobile and
   * desktop. Clear sits on the left (immediate reset + navigate).
   * Apply sits on the right (commits all pending filters).
   * Apply is disabled when nothing has changed (not dirty).
   */
  function renderActionBar() {
    return (
      <div className="flex items-center gap-3">
        {/* Clear: immediate reset + navigate */}
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-brand
                     hover:text-brand-hover transition-colors
                     focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-brand focus-visible:ring-offset-1"
        >
          {labels.filterClear}
        </button>

        {/* Apply: commits all pending filters in one navigation.
            Disabled when the pending state matches the applied filters. */}
        <button
          type="button"
          onClick={handleApply}
          disabled={!isDirty}
          aria-disabled={!isDirty}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-brand focus-visible:ring-offset-1
                      ${isDirty
                        ? "bg-ink text-surface hover:bg-brand"
                        : "bg-line text-faint cursor-not-allowed"
                      }`}
        >
          {labels.filterApply}
        </button>
      </div>
    );
  }

  /* ---- Render ----------------------------------------------------------- */

  return (
    <div>
      {/* Page header row: heading left, sort control right.
          The mobile filter trigger is a floating button (below);
          only the sort dropdown sits in this header row. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        {heading}

        <div className="flex items-center gap-3">
          {sortSlot}
        </div>
      </div>

      {/* Floating filter button (mobile only, hidden at lg+).
          Position-fixed bottom-right so it follows the scroll
          natively. Carries the localized label, a filter funnel
          icon, and the APPLIED filter count badge. z-30 keeps it
          above page content but below the open panel + backdrop. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-expanded={isOpen}
        aria-controls="mobile-filter-panel"
        className="fixed bottom-6 right-4 z-30 flex items-center gap-2 rounded-full
                   bg-ink px-4 py-2.5 text-sm font-medium text-surface shadow-lg
                   transition-colors hover:bg-brand
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-brand focus-visible:ring-offset-2
                   lg:hidden"
      >
        {/* Filter funnel icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M1.5 2.5h13l-5 5.5v4.5l-3-1.5V8L1.5 2.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {labels.filtersTitle}

        {/* Applied filter count badge (shows APPLIED count, not pending) */}
        {filters.hasFilters && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center
                       rounded-full bg-brand px-1 text-[0.625rem] font-semibold text-surface"
          >
            {countActiveFilters(filters)}
          </span>
        )}
      </button>

      {/* Dimmed backdrop scrim (mobile only, visible when panel is open).
          Clicking it closes the panel. z-40 sits between the floating
          button (z-30) and the panel (z-50). */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closePanel}
          aria-hidden="true"
        />
      )}

      {/* Mobile full-screen filter panel.
          Three-row flex column using 100dvh so mobile browser chrome
          does not clip the bottom action bar:
            Row 1 (fixed): title bar with close button
            Row 2 (flex-1, scrollable): filter sections
            Row 3 (fixed): Clear + Apply action bar */}
      {isOpen && (
        <div
          id="mobile-filter-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="filter-panel-title"
          className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-surface lg:hidden"
        >
          {/* Row 1: title bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
            <span
              id="filter-panel-title"
              className="text-base font-semibold text-ink"
            >
              {labels.filtersTitle}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={closePanel}
              aria-label={labels.filtersClose}
              className="rounded-md p-1.5 text-faint transition-colors hover:text-ink
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Row 2: scrollable filter body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="rounded-lg border border-line bg-surface">
              {renderFilterSections("m-")}
            </div>
          </div>

          {/* Row 3: action bar (Clear + Apply) */}
          <div className="shrink-0 border-t border-line px-4 py-3">
            {renderActionBar()}
          </div>
        </div>
      )}

      {/* Content area: desktop sidebar + product grid.
          On mobile the grid is inactive (lg:grid); the desktop
          sidebar is hidden; only the product grid is visible. */}
      <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-6">
        {/* Desktop sidebar (hidden on mobile, always visible at lg+).
            Contains: title heading, filter sections card, and inline
            Clear + Apply at the end of the sidebar flow. */}
        <div className="hidden lg:block">
          {/* Sidebar title heading */}
          <h2 className="mb-4 text-base font-semibold text-ink">
            {labels.filtersTitle}
          </h2>

          {/* Filter sections card with desktop id prefix */}
          <div className="rounded-lg border border-line bg-surface">
            {renderFilterSections("d-")}
          </div>

          {/* Desktop action bar (inline, in normal flow) */}
          <div className="mt-3">
            {renderActionBar()}
          </div>
        </div>

        {/* Product grid, empty state, and pagination */}
        <div className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
