/**
 * Loading skeleton for category listing pages.
 *
 * Mirrors the real page layout 1:1 so nothing shifts when data arrives:
 * - Header row: heading placeholder left, segmented sort control right.
 * - Grid of ledger-style card skeletons matching ProductCard (image pane
 *   with hairline rule below, identity lines, bottom price row above a
 *   hairline rule) in the same 2/3/4-column responsive grid.
 *
 * Placeholder bars use faint ink washes (bg-ink/5, bg-ink/10) instead of
 * gray-* so the shimmer stays on the token palette.
 */

export default function CategoryLoading() {
  return (
    <div>
      {/* Header row: heading left, sort control right (matches the real
          page's flex-wrap justify-between layout). */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        {/* Heading placeholder (text-2xl/3xl heading). */}
        <div className="h-8 w-48 rounded bg-ink/10 animate-pulse sm:h-9" />

        {/* Sort control placeholder: small label + one segmented bar. */}
        <div className="flex items-center gap-3">
          <div className="h-3 w-16 rounded bg-ink/10 animate-pulse" />
          <div className="h-9 w-64 max-w-full rounded-md border border-line bg-surface animate-pulse" />
        </div>
      </div>

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
