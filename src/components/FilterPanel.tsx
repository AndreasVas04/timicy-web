"use client";

/**
 * FilterPanel -- sidebar filter controls for category pages.
 *
 * Owns the full category page layout: header row (heading + mobile
 * toggle + sort), filter sections (sidebar on desktop, disclosure
 * panel on mobile), and the product content area (passed as children).
 *
 * Layout:
 *   Desktop (lg+): 250 px left sidebar alongside the product grid.
 *   Mobile (below lg): a disclosure button next to the sort control
 *   toggles a full-width filter sheet above the product grid.
 *
 * Filter sections are stacked vertically in both breakpoints:
 *   1. Title heading with Clear control (when filters are active)
 *   2. Brand checkboxes with search + show-more/less expander
 *   3. Price range inputs (stacked) with Apply
 *   4. Show-unavailable toggle
 *
 * Apply model: brand checkboxes and the stock toggle navigate
 * immediately (single-action, binary). Price inputs batch behind
 * an Apply button because both endpoints should be set first.
 *
 * All navigation URLs go through buildCategoryUrl from
 * src/lib/filter-params.ts. Every filter change resets pagination
 * to page 1 and preserves the current sort order.
 */

import { type ReactNode, useState, useRef } from "react";
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
};

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
  /** Brand names for this category, ordered by product count (most popular first). */
  brands: string[];
  /** Pre-translated UI label strings from the category i18n namespace. */
  labels: FilterLabels;
  /** The page heading element, passed as a slot so FilterPanel can
   *  place it inside the header row it manages. */
  heading: ReactNode;
  /** The sort dropdown, passed as a slot so it sits next to the
   *  mobile filter toggle in the header controls row. */
  sortSlot: ReactNode;
  /** Product grid, empty state, and pagination -- slotted into the
   *  main content area beside (desktop) or below (mobile) the sidebar. */
  children: ReactNode;
}) {
  const router = useRouter();

  /* ---- Local UI state --------------------------------------------------- */

  /** Whether the mobile disclosure panel is open. */
  const [isOpen, setIsOpen] = useState(false);

  /** Whether the brand list is expanded past the initial limit. */
  const [brandsExpanded, setBrandsExpanded] = useState(false);

  /** Client-side search term for narrowing the brand checkbox list.
   *  Pending-state only -- does not trigger navigation. */
  const [brandSearch, setBrandSearch] = useState("");

  /** Refs to the price input elements. Uncontrolled inputs avoid the
   *  need for useState/useEffect syncing; they remount via React key
   *  when the URL-driven filter values change. */
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  /* ---- Derived values --------------------------------------------------- */

  /** Set of currently active brand slugs for quick checkbox lookup. */
  const activeBrandSlugs = new Set(filters.brands);

  /** Brands filtered by the local search term (case-insensitive).
   *  When the search field is empty, all brands are included. */
  const filteredBrands = brandSearch
    ? brands.filter((b) =>
        b.toLowerCase().includes(brandSearch.toLowerCase())
      )
    : brands;

  /** When a search term is active, bypass the expander and show every
   *  match. Otherwise respect the collapsed/expanded toggle. */
  const visibleBrands =
    brandSearch || brandsExpanded
      ? filteredBrands
      : filteredBrands.slice(0, BRAND_VISIBLE_COUNT);

  /** The expander is only needed when there is no search term and the
   *  full list exceeds the visible-count threshold. */
  const needsExpander =
    !brandSearch && filteredBrands.length > BRAND_VISIBLE_COUNT;

  /** Stable key for price inputs so they remount (and reset to correct
   *  defaultValue) when the URL-driven price filters change. */
  const priceKey = `${filters.min}-${filters.max}`;

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

  /** Toggle a brand checkbox and navigate immediately. */
  function handleBrandToggle(brand: string) {
    const slug = brandToSlug(brand);
    const newSlugs = new Set(activeBrandSlugs);
    if (newSlugs.has(slug)) {
      newSlugs.delete(slug);
    } else {
      newSlugs.add(slug);
    }
    navigateWithFilters({ ...filters, brands: [...newSlugs].sort() });
  }

  /** Read pending price values from refs, validate, and navigate.
   *  Swaps min/max if inverted so the user always gets results. */
  function handlePriceApply() {
    const rawMin = minInputRef.current?.value ?? "";
    const rawMax = maxInputRef.current?.value ?? "";
    let min = rawMin ? parseInt(rawMin, 10) : null;
    let max = rawMax ? parseInt(rawMax, 10) : null;
    if (min !== null && (!Number.isFinite(min) || min < 0)) min = null;
    if (max !== null && (!Number.isFinite(max) || max < 0)) max = null;
    if (min !== null && max !== null && min > max) {
      [min, max] = [max, min];
      if (minInputRef.current) minInputRef.current.value = String(min);
      if (maxInputRef.current) maxInputRef.current.value = String(max);
    }
    navigateWithFilters({ ...filters, min, max });
  }

  /** Toggle the stock/availability filter and navigate immediately. */
  function handleStockToggle() {
    navigateWithFilters({
      ...filters,
      stock: filters.stock === "all" ? "in" : "all",
    });
  }

  /** Clear all filters and navigate to the clean category URL. */
  function handleClear() {
    if (minInputRef.current) minInputRef.current.value = "";
    if (maxInputRef.current) maxInputRef.current.value = "";
    setBrandSearch("");
    navigateWithFilters({ brands: [], min: null, max: null, stock: "in" });
  }

  /* ---- Filter sections (shared between mobile panel and sidebar) -------- */

  const filterSections = (
    <div className="rounded-lg border border-line bg-surface">

      {/* -- Section 1: Title heading + Clear control ---------------------- */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <span className="text-sm font-semibold text-ink">
          {labels.filtersTitle}
        </span>
        {filters.hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm font-medium text-brand hover:text-brand-hover
                       rounded focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-brand focus-visible:ring-offset-1"
          >
            {labels.filterClear}
          </button>
        )}
      </div>

      {/* -- Section 2: Brand checkboxes ----------------------------------- */}
      {brands.length > 0 && (
        <fieldset className="px-4 py-3 border-b border-line">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-faint">
            {labels.filterBrand}
          </legend>

          {/* Brand search input -- filters the checkbox list client-side.
              When a search term is active the expander is bypassed and
              all matching brands are shown. */}
          <label htmlFor="brand-search" className="sr-only">
            {labels.filterBrandSearch}
          </label>
          <input
            id="brand-search"
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
              const isChecked = activeBrandSlugs.has(slug);
              const inputId = `brand-${slug}`;
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

      {/* -- Section 3: Price range ---------------------------------------- */}
      <fieldset className="px-4 py-3 border-b border-line">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-faint">
          {labels.filterPrice}
        </legend>

        {/* Stacked price inputs + Apply button. Inputs remount via
            priceKey when URL-driven values change (browser back, Clear). */}
        <div className="flex flex-col gap-2" key={priceKey}>
          <label htmlFor="filter-min" className="sr-only">
            {labels.filterMin}
          </label>
          <input
            ref={minInputRef}
            id="filter-min"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder={labels.filterMin}
            defaultValue={filters.min !== null ? String(filters.min) : ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePriceApply();
            }}
            className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5
                       text-sm tabular-nums text-ink placeholder:text-faint
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-brand focus-visible:ring-offset-1"
          />
          <label htmlFor="filter-max" className="sr-only">
            {labels.filterMax}
          </label>
          <input
            ref={maxInputRef}
            id="filter-max"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            placeholder={labels.filterMax}
            defaultValue={filters.max !== null ? String(filters.max) : ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePriceApply();
            }}
            className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5
                       text-sm tabular-nums text-ink placeholder:text-faint
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-brand focus-visible:ring-offset-1"
          />

          {/* Apply button: primary ink with teal hover. */}
          <button
            type="button"
            onClick={handlePriceApply}
            className="w-full rounded-md bg-ink px-3 py-1.5 text-sm font-medium
                       text-surface transition-colors hover:bg-brand
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-brand focus-visible:ring-offset-1"
          >
            {labels.filterApply}
          </button>
        </div>
      </fieldset>

      {/* -- Section 4: Availability toggle -------------------------------- */}
      <div className="px-4 py-3">
        <label
          htmlFor="filter-stock"
          className="flex cursor-pointer items-center gap-2 text-sm text-ink"
        >
          <input
            id="filter-stock"
            type="checkbox"
            checked={filters.stock === "all"}
            onChange={handleStockToggle}
            className="h-4 w-4 border-line accent-brand
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-brand focus-visible:ring-offset-1"
          />
          {labels.showUnavailable}
        </label>
      </div>
    </div>
  );

  /* ---- Render ----------------------------------------------------------- */

  return (
    <div>
      {/* Page header row: heading left, controls right.
          On mobile the filter toggle sits next to the sort dropdown. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        {heading}

        <div className="flex items-center gap-3">
          {/* Mobile disclosure toggle with chevron + active-filter badge */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            className="flex items-center gap-1.5 rounded-md border border-line
                       bg-surface px-3 py-1.5 text-sm font-medium text-ink
                       transition-colors hover:border-brand hover:text-brand
                       focus-visible:outline-none focus-visible:ring-2
                       focus-visible:ring-brand focus-visible:ring-offset-1
                       lg:hidden"
          >
            {labels.filtersTitle}

            {/* Chevron rotates when the panel is open */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Active filter count badge */}
            {filters.hasFilters && (
              <span
                className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center
                           rounded-full bg-brand px-1 text-[0.625rem] font-semibold text-surface"
              >
                {countActiveFilters(filters)}
              </span>
            )}
          </button>

          {sortSlot}
        </div>
      </div>

      {/* Content area: sidebar (desktop) + product grid.
          On mobile the filter panel is a full-width sheet toggled by
          the disclosure button; on desktop it is an always-visible
          left sidebar within a CSS grid. A single DOM instance of
          filterSections is shared between both breakpoints via
          responsive visibility classes. */}
      <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-6">
        {/* Filter panel: hidden on mobile by default, revealed when
            the disclosure toggle is open. Always visible on desktop. */}
        <div className={isOpen ? "mb-4 lg:mb-0" : "hidden lg:block"}>
          {filterSections}
        </div>

        {/* Product grid, empty state, and pagination */}
        <div className="min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Count active filter groups for the mobile badge.
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
