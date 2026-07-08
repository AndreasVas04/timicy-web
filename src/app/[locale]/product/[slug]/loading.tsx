/**
 * Loading skeleton for product detail pages.
 *
 * Mirrors the real product page structure: hero section (image + title +
 * price), offers list, and price history chart area. Uses Tailwind's
 * animate-pulse for shimmer, matching the pattern used by the chart's
 * lazy-loading placeholder in PriceHistoryChartLazy.tsx.
 */

export default function ProductLoading() {
  return (
    <article>
      {/* Hero section: image + text side-by-side on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Product image placeholder — matches the real page's sm:w-64 h-64 */}
        <div className="w-full sm:w-64 h-64 bg-gray-100 rounded-lg animate-pulse flex-shrink-0" />

        {/* Text column: brand, title, price placeholders */}
        <div className="flex flex-col gap-3 flex-1">
          {/* Brand */}
          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          {/* Title line 1 */}
          <div className="h-7 w-3/4 bg-gray-200 rounded animate-pulse" />
          {/* Title line 2 */}
          <div className="h-7 w-1/2 bg-gray-200 rounded animate-pulse" />
          {/* Category */}
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          {/* Price hero */}
          <div className="mt-3">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Offers section heading */}
      <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-4" />

      {/* Offer rows skeleton — three store rows */}
      <div className="border border-line rounded-lg bg-surface divide-y divide-line">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex flex-col gap-2">
              {/* Store name */}
              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
              {/* Price */}
              <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
              {/* Availability */}
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            {/* CTA button */}
            <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>

      {/* Price history section */}
      <div className="mt-8">
        {/* Section heading */}
        <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-4" />
        {/* Chart placeholder — same height as the real chart (300px) */}
        <div className="w-full h-[300px] rounded-lg bg-gray-50 animate-pulse" />
      </div>

      {/* Price alert form placeholder */}
      <div className="border border-line rounded-lg p-4 mt-6 bg-surface">
        <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="flex flex-col gap-3">
          <div className="h-9 w-full bg-gray-100 rounded-md animate-pulse" />
          <div className="h-9 w-full bg-gray-100 rounded-md animate-pulse" />
          <div className="h-9 w-full bg-gray-200 rounded-md animate-pulse" />
        </div>
      </div>
    </article>
  );
}
