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
    <div className="w-full h-[300px] rounded-lg bg-gray-50 animate-pulse" aria-hidden="true" />
  ),
});

// Re-export with the exact same props as the underlying chart so the server
// page can swap the import path with zero prop changes.
export default function PriceHistoryChartLazy(
  props: ComponentProps<typeof PriceHistoryChartType>
) {
  return <PriceHistoryChart {...props} />;
}
