"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type PriceHistoryChartType from "./PriceHistoryChart";

/**
 * Client wrapper that lazy-loads PriceHistoryChart (Recharts, ~222kB) only
 * when it actually renders, keeping that bundle out of the product page's
 * initial JavaScript. ssr:false is used because the chart is purely
 * client-interactive and has no meaningful server-rendered output; it also
 * requires a Client Component boundary, which this file provides (the product
 * page itself is a Server Component and cannot pass ssr:false to dynamic()).
 *
 * A lightweight placeholder keeps the layout height stable while the chart
 * chunk loads, avoiding layout shift.
 */
const PriceHistoryChart = dynamic(() => import("./PriceHistoryChart"), {
  ssr: false,
  loading: () => (
    /* Placeholder mirrors the real chart card exactly — same sheet, same
       header strip (price block left, range control right, same wrap
       behavior at narrow widths) and the same fixed 280px plot area — so
       nothing shifts when the Recharts chunk lands. */
    <div aria-hidden="true" className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-4 pt-4 sm:px-5">
        {/* Price + delta skeleton: matches the 32px price line and the
           16px delta line underneath. */}
        <div>
          <div className="h-8 w-28 rounded bg-ink/5 animate-pulse" />
          <div className="mt-0.5 h-4 w-36 rounded bg-ink/5 animate-pulse" />
        </div>
        {/* Range segmented-control skeleton (five ~text-xs buttons). */}
        <div className="h-7 w-56 max-w-full rounded-md bg-ink/5 animate-pulse" />
      </div>
      {/* Plot-area skeleton: identical fixed height to the real chart. */}
      <div className="h-[280px] w-full pt-3" />
    </div>
  ),
});

// Re-export with the exact same props as the underlying chart so the server
// page can swap the import path with zero prop changes.
export default function PriceHistoryChartLazy(
  props: ComponentProps<typeof PriceHistoryChartType>
) {
  return <PriceHistoryChart {...props} />;
}
