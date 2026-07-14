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
import type { PriceBounds } from "@/lib/queries/category";
import { getFilterPreview } from "@/app/actions/filter-preview";

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
  /** Label template with a "{count}" placeholder, e.g. "Apply ({count})". */
  filterApplyCount: string;
  filterClear: string;
  filterAvailability: string;
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
  priceBounds,
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
  /** Min/max price across available products for the slider range. */
  priceBounds: PriceBounds;
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

  /** Which price field currently has focus, or null if neither.
   *  Used by the focused-empty pattern: a focused field with no
   *  pending value shows an empty box (not the bound fallback),
   *  so the user can type freely without fighting a pre-filled
   *  value. The fallback reappears on blur. */
  const [focusedField, setFocusedField] = useState<"min" | "max" | null>(null);

  /** Collapse state for desktop filter sections.
   *  Maps each section id to its open/closed state.
   *  All sections default to open. Only used by the desktop
   *  sidebar; the mobile panel is always fully expanded. */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    brand: true,
    price: true,
    availability: true,
  });

  /** Toggle a desktop filter section between open and closed. */
  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  /* ---- Live filter preview state --------------------------------------- */

  /** Live price bounds updated by the filter preview. Initialized from
   *  the server-rendered priceBounds prop and refreshed when the user
   *  changes brand selections (bounds are brands-only by design). All
   *  slider and bound-equal logic reads this instead of the prop. */
  const [liveBounds, setLiveBounds] = useState<PriceBounds>(priceBounds);

  /** Live result count from the filter preview, or null when no preview
   *  has been fetched yet. Shown on the Apply button when available. */
  const [liveCount, setLiveCount] = useState<number | null>(null);

  /* ---- Refs for focus management + preview dispatch ------------------- */

  /** The floating filter button; receives focus when the panel closes. */
  const triggerRef = useRef<HTMLButtonElement>(null);

  /** The panel close button; receives focus when the panel opens. */
  const closeRef = useRef<HTMLButtonElement>(null);

  /** Monotonic counter for preview dispatches. Incremented on each
   *  dispatch; stale responses (where the response seq < current seq)
   *  are silently discarded. */
  const seqRef = useRef(0);

  /** Serialized key of the last dispatched preview request. Used to
   *  skip redundant dispatches when the pending state hasn't changed. */
  const lastDispatchedKeyRef = useRef<string | null>(null);

  /** Serialized brands part of the last dispatched preview. Used to
   *  determine whether bounds need refreshing (brands-only semantics). */
  const lastDispatchedBrandsRef = useRef<string | null>(null);

  /** Timer handle for the trailing debounce on preview dispatches. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // Reset preview state: liveBounds back to the prop, count cleared.
    // This covers back/forward, Clear, and post-Apply navigation.
    setLiveBounds(priceBounds);
    setLiveCount(null);
  }

  // Reset dispatch-tracking refs when the applied filters change.
  // Refs cannot be updated during render (react-hooks/refs), so
  // this runs as a post-render effect keyed on the applied key.
  useEffect(() => {
    lastDispatchedKeyRef.current = null;
    lastDispatchedBrandsRef.current = null;
  }, [currentAppliedKey]);

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

  /* ---- Slider derived values ------------------------------------------- */

  /** Adaptive step so the slider snaps to round, useful filter values
   *  (e.g. €2350 not €2347). Exact values are still reachable via the
   *  text inputs, which remain authoritative. ≤500→1, ≤2000→5, >2000→10.
   *  Computed first because the endpoints are rounded to step multiples.
   *  Reads liveBounds (updated by filter preview) instead of the prop. */
  const rawMin = liveBounds.min != null ? Math.floor(liveBounds.min) : 0;
  const rawMax = liveBounds.max != null ? Math.ceil(liveBounds.max) : 0;
  const rawRange = rawMax - rawMin;
  const sliderStep =
    rawRange <= 500 ? 1 : rawRange <= 2000 ? 5 : 10;

  /** Slider endpoints rounded OUTWARD to step multiples so every
   *  snapped drag value lands on a round number (e.g. 240, 250, 2350
   *  instead of 239, 249, 2349). The bar may widen slightly beyond
   *  the true price bounds — this is harmless and intentional. */
  const sliderMin = Math.floor(rawMin / sliderStep) * sliderStep;
  const sliderMax = Math.ceil(rawMax / sliderStep) * sliderStep;

  /** Current slider handle positions, clamped to the valid range.
   *  Falls back to the range endpoints when the pending input is
   *  empty or not a valid number, so the handles rest at the edges
   *  in the "no filter" state. */
  const sliderLow = Math.max(
    sliderMin,
    Math.min(sliderMax, parsePriceStr(pending.min) ?? sliderMin)
  );
  const sliderHigh = Math.max(
    sliderMin,
    Math.min(sliderMax, parsePriceStr(pending.max) ?? sliderMax)
  );

  /** Effective price after applying the bound-equal convention:
   *  a value equal to the corresponding slider endpoint is treated
   *  as "no filter" (null). This keeps URLs clean — min=<sliderMin>
   *  filters nothing — and prevents the inputs from appearing dirty
   *  when they simply display the natural range. */
  const effectiveMin = (() => {
    const v = parsePriceStr(pending.min);
    return v !== null && v === sliderMin ? null : v;
  })();
  const effectiveMax = (() => {
    const v = parsePriceStr(pending.max);
    return v !== null && v === sliderMax ? null : v;
  })();

  /** Whether the pending state differs from the applied filters.
   *  Controls the enabled/disabled state of the Apply button so
   *  the user can tell their tap registered even though nothing
   *  navigates until Apply. Price comparison uses the effective
   *  (bound-normalized) values so resting at a bound edge does
   *  not count as dirty. */
  const isDirty =
    [...pending.brands].sort().join(",") !==
      [...filters.brands].sort().join(",") ||
    effectiveMin !== filters.min ||
    effectiveMax !== filters.max ||
    pending.stock !== filters.stock;

  /* ---- Filter preview dispatch ----------------------------------------- */

  // Serialized key capturing the full pending filter state. Used to
  // detect changes and dedupe dispatches.
  const pendingBrandsKey = [...pending.brands].sort().join(",");
  const pendingKey = [pendingBrandsKey, effectiveMin, effectiveMax, pending.stock].join("|");

  useEffect(() => {
    // No requests when the panel is untouched: preserves zero-cost
    // default path (no server action call on initial render).
    if (!isDirty) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    // Dedupe: skip if the serialized key matches the last dispatch.
    if (pendingKey === lastDispatchedKeyRef.current) return;

    // Clear any previously queued timer before setting a new one.
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Trailing 300ms debounce: avoids flooding the server while the
    // user types prices or toggles brands in quick succession.
    debounceRef.current = setTimeout(() => {
      const seq = ++seqRef.current;

      // Determine whether bounds need refreshing. Bounds are brands-only
      // by design, so we skip the bounds query when brands haven't
      // changed since the last dispatch.
      const skipBounds = pendingBrandsKey === lastDispatchedBrandsRef.current;

      // Record what we dispatched so subsequent renders can dedupe.
      lastDispatchedKeyRef.current = pendingKey;
      lastDispatchedBrandsRef.current = pendingBrandsKey;

      getFilterPreview({
        category,
        brands: [...pending.brands],
        min: effectiveMin,
        max: effectiveMax,
        stock: pending.stock,
        skipBounds,
      }).then((result) => {
        // Stale-response guard: only apply if this is still the most
        // recent dispatch. Older responses are silently discarded.
        if (seq !== seqRef.current) return;

        // On error, keep previous values silently (no jitter).
        if ("error" in result && result.error) return;

        setLiveCount(result.count);
        if (result.bounds !== null && result.bounds !== undefined) {
          setLiveBounds(result.bounds);
        }
      });
    }, 300);

    // Cleanup: cancel the pending timer if the effect re-fires or
    // the component unmounts.
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pendingKey, isDirty, category, effectiveMin, effectiveMax, pending.brands, pending.stock, pendingBrandsKey]);

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

  /** Update the pending min price string (does not navigate).
   *  Stores the raw string verbatim — no coercion, no clamping.
   *  All normalization happens on blur and in handleApply so the
   *  user can type freely without the input fighting back. */
  function handleMinChange(value: string) {
    setPending((p) => ({ ...p, min: value }));
  }

  /** Update the pending max price string (does not navigate). */
  function handleMaxChange(value: string) {
    setPending((p) => ({ ...p, max: value }));
  }

  /** Normalize a price input on blur: strip leading zeros, and
   *  reset to empty if the value equals the slider endpoint
   *  (bound-equal = no filter). Called only on blur and Apply,
   *  never mid-typing. */
  function normalizePriceField(
    field: "min" | "max",
    boundValue: number,
  ) {
    setPending((p) => {
      const raw = p[field];
      if (!raw) return p;
      const n = parseInt(raw, 10);
      // Non-numeric or bound-equal → clear to empty (shows bound
      // fallback, counts as no-filter).
      if (!Number.isFinite(n) || n < 0 || n === boundValue) {
        return { ...p, [field]: "" };
      }
      // Strip leading zeros by re-stringifying the parsed integer.
      const clean = String(n);
      return clean === raw ? p : { ...p, [field]: clean };
    });
  }

  /** Apply all pending filters in a single navigation.
   *  All price normalization happens here (and on blur), never
   *  mid-typing: leading-zero strip, min/max swap if inverted,
   *  bound-equal suppression. Closes the mobile panel so the
   *  user lands back on the filtered results. */
  function handleApply() {
    let min = parsePriceStr(pending.min);
    let max = parsePriceStr(pending.max);
    if (min !== null && max !== null && min > max) {
      [min, max] = [max, min];
    }
    // Bound-equal convention: suppress values that match the slider
    // endpoints since they do not narrow the result set.
    if (min !== null && min === sliderMin) min = null;
    if (max !== null && max === sliderMax) max = null;
    // Reset pending strings so inputs show bounds via the display
    // fallback rather than carrying the literal bound value.
    setPending((p) => ({
      ...p,
      min: min !== null ? String(min) : "",
      max: max !== null ? String(max) : "",
    }));
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
   * Reusable filter section wrapper used by all three filter groups
   * (Brand, Price, Availability). Built to scale: future spec-facet
   * sections can reuse this pattern without modification.
   *
   * Desktop (collapsible=true): renders a full-width header button
   * (section title left, rotating chevron right) that toggles the
   * body open/closed. Uses role="group" + aria-labelledby as an
   * accessible equivalent to fieldset/legend, and aria-expanded +
   * aria-controls for the toggle semantics.
   *
   * Mobile with title (collapsible=false, title provided): static
   * fieldset/legend, always open, no chevron. Preserves the existing
   * mobile panel appearance exactly.
   *
   * Mobile availability (collapsible=false, title=null): plain
   * wrapper with no header, preserving the current headerless layout
   * for the stock toggle on mobile.
   */
  function renderSection(
    sectionId: string,
    idPrefix: string,
    title: string | null,
    collapsible: boolean,
    isLast: boolean,
    content: ReactNode,
  ) {
    /* -- Desktop: collapsible header button + togglable body -- */
    if (collapsible) {
      const isOpen = openSections[sectionId] ?? true;
      const headerId = `${idPrefix}section-${sectionId}-header`;
      const bodyId = `${idPrefix}section-${sectionId}-body`;

      return (
        <div
          key={sectionId}
          role="group"
          aria-labelledby={headerId}
          className={isLast ? "" : "border-b border-line"}
        >
          {/* Section header: clickable full-width row.
              Uses the heading font (Manrope) for clear typographic
              distinction from the body text (Inter). */}
          <button
            type="button"
            id={headerId}
            onClick={() => toggleSection(sectionId)}
            aria-expanded={isOpen}
            aria-controls={bodyId}
            className="flex w-full cursor-pointer items-center justify-between
                       px-4 py-3.5 font-heading text-sm font-semibold text-ink"
          >
            {title}
            {/* Decorative chevron: points down when closed,
                rotates 180deg (points up) when section is open */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={`shrink-0 text-faint transition-transform duration-200
                          ${isOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Collapsible body: only rendered when section is open */}
          {isOpen && (
            <div id={bodyId} className="px-4 pb-4">
              {content}
            </div>
          )}
        </div>
      );
    }

    /* -- Mobile with title: static fieldset/legend, always open -- */
    if (title) {
      return (
        <fieldset
          key={sectionId}
          className={`px-4 pt-5 pb-4${isLast ? "" : " border-b border-line"}`}
        >
          <legend className="mb-2 text-sm font-semibold text-ink">
            {title}
          </legend>
          {content}
        </fieldset>
      );
    }

    /* -- Mobile without title (availability): headerless wrapper -- */
    return (
      <div key={sectionId} className="px-4 pt-5 pb-4">
        {content}
      </div>
    );
  }

  /**
   * Render all three filter section groups: Brand, Price, Availability.
   *
   * Takes an idPrefix ("d-" for desktop, "m-" for mobile) to prevent
   * duplicate element ids across the two DOM instances, and a
   * collapsible flag that switches between the desktop collapsible
   * layout and the mobile static layout.
   *
   * Section content (inputs, checkboxes, sliders) is identical in
   * both modes; only the wrapping structure changes.
   */
  function renderFilterSections(idPrefix: string, collapsible: boolean) {
    /* -- Brand section content: search + checkbox list + expander -- */
    const brandContent = (
      <>
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
      </>
    );

    /* -- Price section content: dual-handle slider + min/max inputs -- */
    const priceContent = (
      <>
        {/* Dual-handle range slider (progressive: hidden when
            bounds are unavailable or the range is zero). Two
            overlapped native <input type="range"> elements: the
            low handle controls pending.min, the high handle
            controls pending.max. pointer-events are restricted
            to the thumb so only the closest handle captures a
            drag. The filled track segment is an absolutely
            positioned div whose left/width are set via inline
            style. */}
        {sliderMin < sliderMax && (
          <div className="relative mb-3 h-5">
            {/* Track background + filled segment, vertically
                centered within the thumb-height container. */}
            <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line">
              <div
                className="absolute h-full rounded-full bg-brand"
                style={{
                  left: `${((sliderLow - sliderMin) / (sliderMax - sliderMin)) * 100}%`,
                  width: `${((sliderHigh - sliderLow) / (sliderMax - sliderMin)) * 100}%`,
                }}
              />
            </div>

            {/* Overlapped range inputs filling the same container
                so the native thumb centers on the track bar. */}
              <input
                id={`${idPrefix}slider-low`}
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={sliderLow}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v <= sliderHigh) {
                    // Reset to empty at the low edge so the bound-equal
                    // convention treats it as "no filter".
                    handleMinChange(v === sliderMin ? "" : String(v));
                  }
                }}
                aria-label={labels.filterMin}
                className="absolute inset-0 m-0 w-full appearance-none bg-transparent
                           pointer-events-none
                           [&::-webkit-slider-runnable-track]:bg-transparent
                           [&::-webkit-slider-thumb]:pointer-events-auto
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-brand
                           [&::-webkit-slider-thumb]:shadow-sm
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-moz-range-track]:bg-transparent
                           [&::-moz-range-track]:border-0
                           [&::-moz-range-thumb]:pointer-events-auto
                           [&::-moz-range-thumb]:appearance-none
                           [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                           [&::-moz-range-thumb]:rounded-full
                           [&::-moz-range-thumb]:bg-brand
                           [&::-moz-range-thumb]:border-0
                           [&::-moz-range-thumb]:shadow-sm
                           [&::-moz-range-thumb]:cursor-pointer"
              />
              <input
                id={`${idPrefix}slider-high`}
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={sliderStep}
                value={sliderHigh}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= sliderLow) {
                    // Reset to empty at the high edge so the bound-equal
                    // convention treats it as "no filter".
                    handleMaxChange(v === sliderMax ? "" : String(v));
                  }
                }}
                aria-label={labels.filterMax}
                className="absolute inset-0 m-0 w-full appearance-none bg-transparent
                           pointer-events-none
                           [&::-webkit-slider-runnable-track]:bg-transparent
                           [&::-webkit-slider-thumb]:pointer-events-auto
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-brand
                           [&::-webkit-slider-thumb]:shadow-sm
                           [&::-webkit-slider-thumb]:cursor-pointer
                           [&::-moz-range-track]:bg-transparent
                           [&::-moz-range-track]:border-0
                           [&::-moz-range-thumb]:pointer-events-auto
                           [&::-moz-range-thumb]:appearance-none
                           [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                           [&::-moz-range-thumb]:rounded-full
                           [&::-moz-range-thumb]:bg-brand
                           [&::-moz-range-thumb]:border-0
                           [&::-moz-range-thumb]:shadow-sm
                           [&::-moz-range-thumb]:cursor-pointer"
              />
          </div>
        )}

        {/* Controlled price inputs with the focused-empty pattern:
            - pending has a value: show it (user is editing);
            - field is focused, pending empty: show "" (empty box,
              user starts typing from scratch);
            - not focused, pending empty: show the slider bound as
              a fallback so the user sees the range at rest.
            onChange stores the raw string verbatim (no coercion);
            all normalization (leading-zero strip, bound-equal
            reset) happens on blur and in handleApply only. */}
        <div className="flex gap-2">
          <div className="flex-1">
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
              value={
                pending.min
                  ? pending.min
                  : focusedField === "min"
                    ? ""
                    : sliderMin < sliderMax ? String(sliderMin) : ""
              }
              onFocus={() => setFocusedField("min")}
              onChange={(e) => handleMinChange(e.target.value)}
              onBlur={() => {
                setFocusedField(null);
                normalizePriceField("min", sliderMin);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
              className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5
                         text-sm tabular-nums text-ink placeholder:text-faint
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand focus-visible:ring-offset-1"
            />
          </div>
          <div className="flex-1">
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
              value={
                pending.max
                  ? pending.max
                  : focusedField === "max"
                    ? ""
                    : sliderMin < sliderMax ? String(sliderMax) : ""
              }
              onFocus={() => setFocusedField("max")}
              onChange={(e) => handleMaxChange(e.target.value)}
              onBlur={() => {
                setFocusedField(null);
                normalizePriceField("max", sliderMax);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
              className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5
                         text-sm tabular-nums text-ink placeholder:text-faint
                         focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand focus-visible:ring-offset-1"
            />
          </div>
        </div>
      </>
    );

    /* -- Availability section content: single checkbox toggle -- */
    const availabilityContent = (
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
    );

    /* Assemble sections using the shared renderSection wrapper.
       Desktop (collapsible=true) gets header buttons with chevrons
       and collapse/expand behavior. Mobile (collapsible=false) gets
       static fieldsets with legends, matching the existing layout.
       The availability header is only shown on desktop. */
    return (
      <>
        {brands.length > 0 &&
          renderSection("brand", idPrefix, labels.filterBrand, collapsible, false, brandContent)}
        {renderSection("price", idPrefix, labels.filterPrice, collapsible, false, priceContent)}
        {renderSection(
          "availability",
          idPrefix,
          collapsible ? labels.filterAvailability : null,
          collapsible,
          true,
          availabilityContent,
        )}
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
            Disabled when the pending state matches the applied filters.
            When a live preview count is available and the panel is dirty,
            show the count-templated label (e.g. "Apply (42)"); otherwise
            show the plain label. No spinner or layout shift while a
            preview is in flight. */}
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
          {isDirty && liveCount !== null
            ? labels.filterApplyCount.replace("{count}", String(liveCount))
            : labels.filterApply}
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
              {renderFilterSections("m-", false)}
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
         *
         * ---- Visual Design Direction ----
         *
         * Three directions evaluated against the Price Ledger language:
         *
         * A. Borderless hairline-ruled groups on the page background:
         *    Clean and open, but filter inputs float without visual
         *    containment on the gray page, weakening the "white sheets
         *    lifted off a cool gray page" metaphor.
         *
         * B. Single white sheet with internal hairline rules (chosen):
         *    Matches the core Price Ledger pattern. Internal hairlines
         *    separate sections; collapsible headers with chevrons add
         *    rhythm and interactivity. Removing the external "Filters"
         *    h2 eliminates the double-framing between the heading and
         *    the card border. Closest to the Public.cy reference:
         *    contained groups, generous spacing, weighted headers, all
         *    sections open by default.
         *
         * C. Individually carded sections with gap spacing:
         *    Three separate bordered cards fragment the panel visually
         *    and create too much noise for the calm, confident tone.
         * ---------------------------------------- */}
        <div className="hidden lg:block">
          {/* Filter sheet: single white card with internally ruled
              collapsible sections and the action bar integrated at
              the bottom, separated by a hairline. */}
          <div className="rounded-lg border border-line bg-surface">
            {renderFilterSections("d-", true)}

            {/* Action bar (Clear + Apply) at the bottom of the sheet,
                separated by a hairline. Inline in normal document flow
                (never sticky). */}
            <div className="border-t border-line px-4 py-3">
              {renderActionBar()}
            </div>
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
