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
    /* Placeholder mirrors the real chart layout (segmented range control
       plus the 300px plot sheet) so nothing shifts when the chunk lands. */
    <div aria-hidden="true">
      <div className="mb-4 h-9 w-64 max-w-full rounded-md bg-ink/5 animate-pulse" />
      <div className="w-full h-[300px] rounded-lg border border-line bg-surface animate-pulse" />
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
