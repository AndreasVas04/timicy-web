"use client";

/**
 * Desktop header search input.
 *
 * Renders the search input inline in the header row, always visible on
 * desktop (>= md). On mobile the input is hidden via md:hidden -- the
 * mobile search lives in a separate full-width row rendered directly
 * by the layout, following the standard mobile comparison-site pattern
 * (Public, Skroutz, BestPrice) where search is always visible in its
 * own row below the header bar.
 *
 * The actual search logic lives entirely in SearchAutocomplete -- this
 * wrapper only provides the responsive container and positioning.
 */

import { SearchAutocomplete } from "./SearchAutocomplete";

export function HeaderSearch() {
  return (
    /* Desktop: always-visible compact search input, takes flex-1
       space between the logo and right-side navigation. */
    <div className="hidden md:block flex-1 max-w-md mx-4">
      <SearchAutocomplete instanceId="header" compact />
    </div>
  );
}
