/**
 * Loading skeleton for category listing pages.
 *
 * Mirrors the real page layout: a heading placeholder, sort pills,
 * and a grid of skeleton product cards matching the category page's
 * 2/3/4-column responsive grid. Uses Tailwind's animate-pulse for a
 * subtle shimmer effect while data loads, preventing layout shift.
 */

export default function CategoryLoading() {
  return (
    <div>
      {/* Heading skeleton */}
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />

      {/* Sort pills skeleton — three pill-shaped placeholders */}
      <div className="flex gap-2 mb-6">
        <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-8 w-28 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-8 w-28 bg-gray-200 rounded-full animate-pulse" />
      </div>

      {/* Product card grid skeleton — matches grid-cols-2 sm:3 lg:4 */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <li key={i}>
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              {/* Image area — square aspect ratio matching product cards */}
              <div className="aspect-square bg-gray-100 animate-pulse" />

              {/* Text area — brand, title, and price placeholders */}
              <div className="p-3 flex flex-col gap-2">
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mt-1" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
