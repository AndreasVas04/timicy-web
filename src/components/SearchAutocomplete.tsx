"use client";

/**
 * Search autocomplete component — client-side search input with a live
 * dropdown of product results fetched from the /api/search Route Handler.
 *
 * Known limitation: Greek-language queries match products whose canonical
 * title is Greek (most appliances) but may miss tech products whose
 * canonical title is English. Improving Greek recall is deferred.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { buildProductSlug } from "@/lib/slug";

/** Shape of a single search result from the API. */
interface SearchResult {
  id: number;
  canonical_title: string;
  brand: string;
  image_url: string | null;
  min_price: number;
  offer_count: number;
}

/**
 * Props for SearchAutocomplete.
 *
 * - instanceId: unique suffix for ARIA ids so multiple instances on the same
 *   page (e.g. header + hero) don't produce duplicate DOM ids.
 * - compact: when true, uses smaller padding/text for tight spaces like
 *   the site header.
 */
interface SearchAutocompleteProps {
  instanceId?: string;
  compact?: boolean;
}

export function SearchAutocomplete({
  instanceId = "main",
  compact = false,
}: SearchAutocompleteProps = {}) {
  const t = useTranslations("search");
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Refs for managing debounce, stale responses, and click-away detection.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Unique ids per instance to avoid DOM id collisions when multiple
  // SearchAutocomplete components are rendered on the same page.
  const listboxId = `search-listbox-${instanceId}`;
  const optionIdPrefix = `search-option-${instanceId}`;

  /**
   * Stale-response guard: we track the latest query that was sent to the
   * API. When a response arrives, we compare its query against this ref.
   * If they don't match the response is from an older (slower) request
   * and we discard it so it doesn't overwrite fresher results.
   */
  const latestQueryRef = useRef("");

  /** Fetch results from the search API. */
  const fetchResults = useCallback(
    async (q: string) => {
      latestQueryRef.current = q;
      setLoading(true);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}`
        );
        const json = await res.json();

        // Only apply results if this query is still the latest one.
        if (latestQueryRef.current === q) {
          setResults(json.results ?? []);
          setOpen(true);
          setHighlightIndex(-1);
        }
      } catch {
        // Network error — degrade gracefully.
        if (latestQueryRef.current === q) {
          setResults([]);
        }
      } finally {
        if (latestQueryRef.current === q) {
          setLoading(false);
        }
      }
    },
    []
  );

  /** Handle input changes with ~250ms debounce. */
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      // Below minimum length — clear results immediately.
      setResults([]);
      setOpen(false);
      setLoading(false);
      latestQueryRef.current = "";
      return;
    }

    debounceTimer.current = setTimeout(() => {
      fetchResults(trimmed);
    }, 250);
  }

  /**
   * Keyboard navigation within the dropdown.
   *
   * Enter behavior:
   *  - If a result is highlighted (via ArrowDown/Up), navigate to that product.
   *  - If NO result is highlighted, navigate to the full search results page
   *    at /search?q=<query> (only when query >= 2 chars). This lets the user
   *    press Enter immediately to see all results instead of picking from
   *    the autocomplete dropdown.
   */
  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        if (!open || results.length === 0) return;
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        if (!open || results.length === 0) return;
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (open && results.length > 0 && highlightIndex >= 0) {
          // A result is highlighted — navigate to that specific product.
          const result = results[highlightIndex];
          if (result) {
            const link = containerRef.current?.querySelector<HTMLAnchorElement>(
              `[data-result-index="${highlightIndex}"]`
            );
            link?.click();
          }
        } else {
          // No highlight — navigate to the full search results page.
          const trimmed = query.trim();
          if (trimmed.length >= 2) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(trimmed)}`);
          }
        }
        break;
      case "Escape":
        setOpen(false);
        setHighlightIndex(-1);
        break;
    }
  }

  /** Close dropdown when clicking outside the component. */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setHighlightIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** Clean up debounce timer on unmount. */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Input wrapper: relative so the leading icon and trailing spinner align to the
          input itself, independent of the dropdown that follows below. */}
      <div className="relative">
        {/* Leading magnifier icon (decorative). */}
        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400`} aria-hidden="true">
          <svg className={compact ? "h-4 w-4" : "h-5 w-5"} xmlns="http://www.w3.org/2000/svg"
               fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0 && query.trim().length >= 2) {
              setOpen(true);
            }
          }}
          placeholder={t("placeholder")}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={
            highlightIndex >= 0 ? `${optionIdPrefix}-${highlightIndex}` : undefined
          }
          aria-autocomplete="list"
          className={`w-full rounded-lg border border-line
                     focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand
                     ${compact ? "pl-9 pr-9 py-1.5 text-sm" : "pl-11 pr-11 py-3 text-base"}`}
        />

        {/* Trailing loading spinner — replaces the previous text label. */}
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand" aria-hidden="true">
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200
                     bg-white shadow-lg"
        >
          {results.length === 0 && !loading ? (
            <li className="px-4 py-3 text-sm text-gray-500">
              {t("noResults")}
            </li>
          ) : (
            results.map((result, index) => (
              <li
                key={result.id}
                id={`${optionIdPrefix}-${index}`}
                role="option"
                aria-selected={index === highlightIndex}
              >
                <Link
                  href={`/product/${buildProductSlug(result.id, result.canonical_title)}`}
                  data-result-index={index}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    index === highlightIndex
                      ? "bg-brand/10"
                      : "hover:bg-page"
                  }`}
                >
                  {/* Product image with fallback for null image_url */}
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                    {/* Thumbnail — fixed 40×40, no `fill` needed. */}
                    {result.image_url ? (
                      <Image src={result.image_url} alt="" width={40} height={40} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {result.canonical_title}
                    </p>
                    <p className="text-xs text-gray-500">{result.brand}</p>
                  </div>

                  {/* Price */}
                  <span className="flex-shrink-0 text-sm font-semibold text-green-700">
                    {t("fromPrice", {
                      price: `€${Number(result.min_price).toFixed(2)}`,
                    })}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
