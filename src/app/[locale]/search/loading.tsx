/**
 * Loading skeleton for search results pages.
 *
 * Mirrors the real search page layout: heading, result count, and a
 * grid of skeleton product cards matching the search page's 2/3/4-column
 * responsive grid. Uses Tailwind's animate-pulse for shimmer.
 */

export default function SearchLoading() {
  return (
    <div>
      {/* Heading skeleton ("Search results for …") */}
      <div className="h-8 w-72 bg-gray-200 rounded animate-pulse mb-2" />

      {/* Result count skeleton */}
      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-6" />

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
