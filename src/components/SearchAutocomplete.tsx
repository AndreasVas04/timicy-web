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
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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

export function SearchAutocomplete() {
  const t = useTranslations("search");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Refs for managing debounce, stale responses, and click-away detection.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "search-listbox";

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

  /** Keyboard navigation within the dropdown. */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      // Allow Enter on closed dropdown to do nothing special.
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        {
          // Navigate to the highlighted result, or the first one if none highlighted.
          const idx = highlightIndex >= 0 ? highlightIndex : 0;
          const result = results[idx];
          if (result) {
            // Programmatic navigation via the link click.
            const link = containerRef.current?.querySelector<HTMLAnchorElement>(
              `[data-result-index="${idx}"]`
            );
            link?.click();
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
      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Re-open dropdown if there are results when the input is re-focused.
          if (results.length > 0 && query.trim().length >= 2) {
            setOpen(true);
          }
        }}
        placeholder={t("placeholder")}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={
          highlightIndex >= 0 ? `search-option-${highlightIndex}` : undefined
        }
        aria-autocomplete="list"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base
                   focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {/* Loading indicator — subtle dot animation next to the input */}
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          {t("loading")}
        </span>
      )}

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
                id={`search-option-${index}`}
                role="option"
                aria-selected={index === highlightIndex}
              >
                <Link
                  href={`/product/${buildProductSlug(result.id, result.canonical_title)}`}
                  data-result-index={index}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    index === highlightIndex
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {/* Product image with fallback for null image_url */}
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                    {result.image_url ? (
                      <img
                        src={result.image_url}
                        alt=""
                        className="h-full w-full object-contain"
                      />
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
