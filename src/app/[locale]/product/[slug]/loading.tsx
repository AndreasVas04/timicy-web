/**
 * Loading skeleton for product detail pages.
 *
 * Mirrors the real product page structure 1:1 so nothing shifts when
 * data arrives:
 * - Header: bordered image sheet (sm:w-72 h-72) + brand/title lines and
 *   the navy price plate (deep ink + graph-paper grid, like the real one).
 * - Offers ledger: one white sheet, three hairline-divided rows with
 *   store lines, right-aligned price, and CTA placeholder.
 * - Chart section: segmented range-control bar + 300px bordered sheet
 *   (matches PriceHistoryChartLazy's own placeholder).
 * - Alert form: bordered sheet with the teal left rail.
 *
 * Placeholder bars use faint ink washes (bg-ink/5, bg-ink/10) on white
 * and white washes (bg-white/10) on the navy plate, keeping the shimmer
 * on the token palette.
 */

export default function ProductLoading() {
  return (
    <article>
      {/* Header: image sheet + text column (matches gap-5 sm:gap-8 mb-10). */}
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 mb-10">
        {/* Product image sheet — bordered white sheet, same dimensions. */}
        <div className="w-full sm:w-72 h-64 sm:h-72 rounded-lg border border-line bg-ink/5 animate-pulse flex-shrink-0" />

        {/* Text column: brand, title, category, navy price plate. */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {/* Brand eyebrow. */}
          <div className="h-3 w-20 rounded bg-ink/10 animate-pulse" />
          {/* Title lines (text-2xl/3xl heading). */}
          <div className="mt-1 h-8 w-3/4 rounded bg-ink/10 animate-pulse" />
          <div className="h-8 w-1/2 rounded bg-ink/10 animate-pulse" />
          {/* Category line. */}
          <div className="mt-1 h-4 w-32 rounded bg-ink/10 animate-pulse" />

          {/* Price plate: same navy graph-paper plate as the real page,
              with white-wash placeholder bars inside. */}
          <div className="mt-4 max-w-md rounded-lg bg-ink-deep grid-paper px-5 py-4">
            <div className="h-3 w-24 rounded bg-white/10 animate-pulse" />
            <div className="mt-2 h-10 w-40 rounded bg-white/10 animate-pulse sm:h-12" />
            <div className="mt-2 h-4 w-32 rounded bg-white/10 animate-pulse" />
          </div>

          {/* Freshness line. */}
          <div className="mt-3 h-3 w-40 rounded bg-ink/10 animate-pulse" />
        </div>
      </div>

      {/* Offers section heading. */}
      <div className="h-6 w-48 rounded bg-ink/10 animate-pulse mb-3" />

      {/* Offers ledger skeleton — three hairline-divided store rows. */}
      <div className="divide-y divide-line border border-line rounded-lg bg-surface overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 border-l-[3px] border-l-transparent"
          >
            {/* Store name + availability. */}
            <div className="flex flex-col gap-2 sm:flex-1">
              <div className="h-4 w-28 rounded bg-ink/10 animate-pulse" />
              <div className="h-3 w-16 rounded bg-ink/10 animate-pulse" />
            </div>
            {/* Price (right-aligned on desktop). */}
            <div className="h-7 w-24 rounded bg-ink/10 animate-pulse sm:self-center" />
            {/* CTA button. */}
            <div className="h-10 w-32 rounded-md bg-ink/10 animate-pulse sm:ml-6" />
          </div>
        ))}
      </div>

      {/* Price history section. */}
      <div className="mt-8">
        {/* Section heading. */}
        <div className="h-6 w-36 rounded bg-ink/10 animate-pulse mb-3" />
        {/* Range segmented-control bar (matches PriceHistoryChartLazy). */}
        <div className="mb-4 h-9 w-64 max-w-full rounded-md bg-ink/5 animate-pulse" />
        {/* Chart sheet — same height as the real chart (300px). */}
        <div className="w-full h-[300px] rounded-lg border border-line bg-surface animate-pulse" />
      </div>

      {/* Price alert form skeleton — bordered sheet with teal left rail. */}
      <div className="mt-8 rounded-lg border border-line border-l-[3px] border-l-brand bg-surface p-4 sm:p-5">
        <div className="h-5 w-36 rounded bg-ink/10 animate-pulse mb-2" />
        <div className="h-4 w-64 max-w-full rounded bg-ink/10 animate-pulse mb-4" />
        <div className="flex flex-col gap-3">
          <div className="h-10 w-full rounded-md bg-ink/5 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-ink/5 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-ink/10 animate-pulse" />
        </div>
      </div>
    </article>
  );
}
