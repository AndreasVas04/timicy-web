/**
 * Loading skeleton for search results pages.
 *
 * Mirrors the real search page layout 1:1 so nothing shifts when data
 * arrives: heading, result count line, and a grid of ledger-style card
 * skeletons matching ProductCard in the same 2/3/4-column grid.
 *
 * Placeholder bars use faint ink washes (bg-ink/5, bg-ink/10) instead of
 * gray-* so the shimmer stays on the token palette.
 */

export default function SearchLoading() {
  return (
    <div>
      {/* Heading skeleton ("Search results for …"). */}
      <div className="h-8 w-72 max-w-full rounded bg-ink/10 animate-pulse mb-2 sm:h-9" />

      {/* Result count skeleton. */}
      <div className="h-4 w-32 rounded bg-ink/10 animate-pulse mb-6" />

      {/* Product card grid skeleton — matches grid-cols-2 sm:3 lg:4 and
          the gap-3 sm:gap-4 spacing of the real grid. */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <li key={i}>
            {/* Card skeleton mirroring ProductCard's ledger structure. */}
            <div className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface">
              {/* Image pane: square with hairline rule below. */}
              <div className="aspect-square border-b border-line bg-ink/5 animate-pulse" />

              {/* Identity block: brand eyebrow + two title lines. */}
              <div className="flex grow flex-col gap-1.5 px-3 pt-2.5 pb-3">
                <div className="h-3 w-14 rounded bg-ink/10 animate-pulse" />
                <div className="h-4 w-full rounded bg-ink/10 animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-ink/10 animate-pulse" />
              </div>

              {/* Price row pinned to the bottom above a hairline rule. */}
              <div className="mt-auto border-t border-line px-3 py-2.5">
                <div className="h-6 w-24 rounded bg-ink/10 animate-pulse" />
                <div className="mt-1 h-3 w-16 rounded bg-ink/10 animate-pulse" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
