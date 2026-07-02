"use client";

/**
 * PriceHistoryChart — client component that renders the cheapest-price
 * time-series as a Recharts step-line chart with time-range toggle buttons.
 *
 * All user-facing strings are passed in via the `labels` prop (translated
 * server-side), so this component contains NO hardcoded EL/EN text and does
 * NOT import any next-intl hooks. It is a pure presentational client component.
 */

import { useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { PricePoint } from "@/lib/price-history/reconstruct";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Labels object — every user-visible string, translated server-side. */
type Labels = {
  /** Shown in tooltip when price is null (all offers unavailable). */
  unavailable: string;
  /** Caption shown when data is too sparse for a meaningful chart. */
  collectingHistory: string;
  /** Time-range toggle button labels. */
  rangeWeek: string;
  rangeMonth: string;
  range6mo: string;
  rangeYear: string;
  rangeAll: string;
};

type Props = {
  /** Reconstructed cheapest-price points, sorted by date ascending. */
  points: PricePoint[];
  /** BCP-47 locale string for date formatting (e.g. "el", "en"). */
  locale: string;
  /** Pre-translated UI strings. */
  labels: Labels;
};

/* -------------------------------------------------------------------------- */
/*  Time-range definitions                                                    */
/* -------------------------------------------------------------------------- */

/** Supported range keys — used for toggle state and filtering. */
type RangeKey = "week" | "month" | "6mo" | "year" | "all";

/**
 * Map each range key to the number of days it represents.
 * "all" uses Infinity so every point is included.
 */
const RANGE_DAYS: Record<RangeKey, number> = {
  week: 7,
  month: 30,
  "6mo": 182,
  year: 365,
  all: Infinity,
};

/* -------------------------------------------------------------------------- */
/*  Helpers: calendar-aware tick generation                                    */
/* -------------------------------------------------------------------------- */

/** Convert a "YYYY-MM-DD" date string to a UTC epoch-ms timestamp. */
function dateToTs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getTime();
}

/** Number of milliseconds in one day. */
const MS_PER_DAY = 86_400_000;

/**
 * Generate tick positions at natural calendar boundaries based on the
 * visible data span.  Professional finance charts (Google Finance,
 * camelcamelcamel) place ticks on clean boundaries — every N days,
 * 1st-of-month, or Jan-1 — rather than at arbitrary data-point dates.
 *
 * We use a numeric time-scale XAxis (type="number" with epoch-ms values)
 * instead of a categorical string axis because Recharts' categorical axis
 * can only place ticks at values that exist as data points. A numeric axis
 * accepts any tick position, so we can place them on calendar boundaries
 * regardless of where actual data points fall.
 *
 * @param firstTs  Epoch-ms of the first visible point.
 * @param lastTs   Epoch-ms of the last visible point.
 * @returns        Object with generated tick timestamps and the
 *                 Intl.DateTimeFormat options to use for labeling them.
 */
function generateCalendarTicks(
  firstTs: number,
  lastTs: number
): {
  ticks: number[];
  formatOpts: Intl.DateTimeFormatOptions;
} {
  const spanDays = Math.round((lastTs - firstTs) / MS_PER_DAY);

  // --- spanDays <= 14: tick every 2 days, format "d MMM" -----------------
  if (spanDays <= 14) {
    const step = 2 * MS_PER_DAY;
    const ticks = generateSteppedTicks(firstTs, lastTs, step);
    return { ticks, formatOpts: { day: "numeric", month: "short" } };
  }

  // --- spanDays <= 60: tick every 7 days (weekly), format "d MMM" --------
  if (spanDays <= 60) {
    const step = 7 * MS_PER_DAY;
    const ticks = generateSteppedTicks(firstTs, lastTs, step);
    return { ticks, formatOpts: { day: "numeric", month: "short" } };
  }

  // --- spanDays <= 180: tick on the 1st of each month, format "MMM" ------
  if (spanDays <= 180) {
    const ticks = generateMonthlyTicks(firstTs, lastTs);
    return { ticks, formatOpts: { month: "short" } };
  }

  // --- spanDays <= 730: tick on the 1st of each month.
  //     Format "MMM" if all within one calendar year, else "MMM yyyy". ----
  if (spanDays <= 730) {
    const ticks = generateMonthlyTicks(firstTs, lastTs);
    const firstYear = new Date(firstTs).getUTCFullYear();
    const lastYear = new Date(lastTs).getUTCFullYear();
    const sameYear = firstYear === lastYear;
    return {
      ticks,
      formatOpts: sameYear
        ? { month: "short" }
        : { month: "short", year: "numeric" },
    };
  }

  // --- spanDays > 730: tick on Jan 1 of each year, format "yyyy" ---------
  const ticks = generateYearlyTicks(firstTs, lastTs);
  return { ticks, formatOpts: { year: "numeric" } };
}

/**
 * Generate ticks at fixed day-intervals starting from the first timestamp.
 * Always includes the first and last timestamps as anchors.
 */
function generateSteppedTicks(firstTs: number, lastTs: number, stepMs: number): number[] {
  const ticks: number[] = [firstTs];
  let t = firstTs + stepMs;
  while (t < lastTs) {
    ticks.push(t);
    t += stepMs;
  }
  // Always anchor the last date, but avoid duplicating if a step landed there.
  if (ticks[ticks.length - 1] !== lastTs) {
    ticks.push(lastTs);
  }
  return ticks;
}

/**
 * Generate ticks on the 1st of each month within [firstTs, lastTs].
 * Always includes first and last timestamps as anchors.
 */
function generateMonthlyTicks(firstTs: number, lastTs: number): number[] {
  const ticks: number[] = [firstTs];

  // Start from the 1st of the month AFTER the first date.
  const first = new Date(firstTs);
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth() + 1; // next month
  if (month > 11) {
    month = 0;
    year++;
  }

  while (true) {
    const t = Date.UTC(year, month, 1);
    if (t >= lastTs) break;
    if (t > firstTs) {
      ticks.push(t);
    }
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  if (ticks[ticks.length - 1] !== lastTs) {
    ticks.push(lastTs);
  }
  return ticks;
}

/**
 * Generate ticks on Jan 1 of each year within [firstTs, lastTs].
 * Always includes first and last timestamps as anchors.
 */
function generateYearlyTicks(firstTs: number, lastTs: number): number[] {
  const ticks: number[] = [firstTs];

  let year = new Date(firstTs).getUTCFullYear() + 1;
  while (true) {
    const t = Date.UTC(year, 0, 1);
    if (t >= lastTs) break;
    ticks.push(t);
    year++;
  }

  if (ticks[ticks.length - 1] !== lastTs) {
    ticks.push(lastTs);
  }
  return ticks;
}

/* -------------------------------------------------------------------------- */
/*  Enriched data point with a numeric timestamp for the time-scale axis      */
/* -------------------------------------------------------------------------- */

type ChartPoint = PricePoint & { ts: number };

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function PriceHistoryChart({ points, locale, labels }: Props) {
  // --- Range toggle state. Default is "all" because data is currently
  //     sparse (most products have 1–2 points); a narrow default would
  //     show an empty chart. -----------------------------------------------
  const [range, setRange] = useState<RangeKey>("all");

  // --- Filter points to the selected time range, with left-edge
  //     carry-forward so the chart always starts at the correct price. -----
  const filtered = useMemo(() => {
    if (range === "all") return points;

    const now = new Date();
    // Compute the cutoff date by subtracting range days from today.
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
    const cutoffStr = cutoff.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Keep all points within the selected window.
    const inWindow = points.filter((p) => p.date >= cutoffStr);

    // Left-edge carry-forward: if the last price change happened before
    // the window, the naïve filter drops it and the chart loses the flat
    // line that was in effect at the window start.  To fix this, find the
    // most recent point before the cutoff and prepend a synthetic point
    // at the cutoff date with that point's price/store.  This makes the
    // line start at the window boundary at the correct carried-forward
    // price instead of showing a single orphan dot at "today".
    const beforeCutoff = points.filter((p) => p.date < cutoffStr);
    if (beforeCutoff.length > 0) {
      const lastBefore = beforeCutoff[beforeCutoff.length - 1];
      inWindow.unshift({
        date: cutoffStr,
        price: lastBefore.price,
        store: lastBefore.store,
      });
    }

    return inWindow;
  }, [points, range]);

  // --- Enrich filtered points with an epoch-ms timestamp. ----------------
  // We use a numeric XAxis (type="number") so that ticks can be placed at
  // arbitrary calendar boundaries, not just at data-point positions.
  // Each point gets a `ts` field = UTC epoch-ms of its date string.
  const chartData: ChartPoint[] = useMemo(
    () => filtered.map((p) => ({ ...p, ts: dateToTs(p.date) })),
    [filtered]
  );

  // --- Calendar-aware tick generation based on the visible data span. ----
  const { ticks: axisTicks, formatOpts: axisFormatOpts } = useMemo(() => {
    if (chartData.length < 2) {
      // Single point or empty: just show that one timestamp.
      return {
        ticks: chartData.map((p) => p.ts),
        formatOpts: { day: "numeric", month: "short" } as Intl.DateTimeFormatOptions,
      };
    }
    const firstTs = chartData[0].ts;
    const lastTs = chartData[chartData.length - 1].ts;
    return generateCalendarTicks(firstTs, lastTs);
  }, [chartData]);

  // --- Axis tick formatter (locale-aware, span-dependent). ---------------
  const axisDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, axisFormatOpts),
    [locale, axisFormatOpts]
  );

  // --- Tooltip date formatter — always "d MMM" for full precision. -------
  const tooltipDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }),
    [locale]
  );

  // --- Custom tooltip driven by dot hover. --------------------------------
  // Recharts' default tooltip uses nearest-x mouse tracking, which causes
  // the tooltip to jump between endpoints on sparse charts when hovering
  // empty space.  Instead, we bypass Recharts' <Tooltip> entirely and
  // manage our own activeIndex + dot position state.  The tooltip only
  // appears when the mouse is directly over a data dot's SVG circle.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeDotPos, setActiveDotPos] = useState<{ cx: number; cy: number } | null>(null);

  // Stable callbacks so the custom dot render doesn't cause re-renders.
  const handleDotEnter = useCallback((index: number, cx: number, cy: number) => {
    setActiveIndex(index);
    setActiveDotPos({ cx, cy });
  }, []);

  const handleDotLeave = useCallback(() => {
    setActiveIndex(null);
    setActiveDotPos(null);
  }, []);

  // --- Empty state: render nothing and let the parent handle it.
  //     This check is placed after all hooks so React's rules-of-hooks
  //     invariant is satisfied (hooks must not be called conditionally). ---
  if (points.length === 0) return null;

  // --- Sparse-data detection: show a "collecting history" caption when
  //     the visible chart is a single dot or a flat line.  Based on the
  //     `filtered` array (not the full `points`) so the caption matches
  //     what the user actually sees in the selected range. ----------------
  const nonNullPrices = filtered.filter((p) => p.price !== null).map((p) => p.price!);
  const isSparse =
    filtered.length === 1 ||
    (nonNullPrices.length > 0 && new Set(nonNullPrices).size === 1);

  /** Format an epoch-ms timestamp for X-axis tick labels (span-aware). */
  const formatTick = (ts: number) => {
    const d = new Date(ts);
    return axisDateFormatter.format(d);
  };

  /** Format Y-axis tick values as "€123". */
  const formatPrice = (value: number) => `€${value}`;

  // --- Range toggle button definitions. ----------------------------------
  const rangeButtons: { key: RangeKey; label: string }[] = [
    { key: "week", label: labels.rangeWeek },
    { key: "month", label: labels.rangeMonth },
    { key: "6mo", label: labels.range6mo },
    { key: "year", label: labels.rangeYear },
    { key: "all", label: labels.rangeAll },
  ];

  return (
    <div>
      {/* Time-range toggle buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {rangeButtons.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
              range === key
                ? "bg-ink text-white border-ink"
                : "bg-white text-gray-700 border-gray-300 hover:border-brand hover:text-brand"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart wrapper — explicit height prevents ResponsiveContainer from
          collapsing to 0px inside flex/grid parents (the most common
          Recharts-in-Next rendering bug).  position:relative so the
          custom tooltip can be absolutely positioned within it. */}
      <div className="w-full h-[300px] relative">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            {/* X-axis: numeric time scale using epoch-ms timestamps.
                We use type="number" with scale="time" instead of a
                categorical string axis because Recharts' categorical axis
                can only render ticks at values that exist as data points.
                A numeric time axis accepts any tick position, so we can
                place them on clean calendar boundaries (1st-of-month,
                Jan-1, etc.) regardless of where data points fall.
                domain is clamped to the data range; ticks are the
                explicitly-generated calendar boundary timestamps. */}
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={axisTicks}
              tickFormatter={formatTick}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />

            {/* Y-axis: prices in euros. Auto domain lets Recharts pick
                sensible min/max from the data. */}
            <YAxis
              tickFormatter={formatPrice}
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              domain={["auto", "auto"]}
              width={60}
            />

            {/* No Recharts <Tooltip> — we render our own tooltip div below
                the chart, positioned via stored dot coordinates.  This
                completely bypasses Recharts' nearest-x mouse tracking so
                the tooltip only appears when hovering directly over a
                data dot's SVG circle. */}

            {/* Price line: stepAfter matches the forward-fill semantics
                (price holds until the next change). connectNulls=false so
                all-unavailable gaps render as visible breaks.
                isAnimationActive=false removes the entrance/hover
                animation that feels laggy on sparse 2-point flat lines.
                activeDot=false disables Recharts' own active-dot overlay
                since our custom dot render handles hover styling. */}
            <Line
              type="stepAfter"
              dataKey="price"
              stroke="#0A6FB0"
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
              dot={(dotProps: {
                cx?: number;
                cy?: number;
                index?: number;
                payload?: ChartPoint;
              }) => {
                const { cx, cy, index, payload } = dotProps;

                // Guard: bail if Recharts didn't provide coordinates
                // (shouldn't happen for rendered points, but satisfies
                // the optional types in DotItemDotProps).
                if (cx == null || cy == null || index == null || !payload) {
                  return <g key="dot-missing" />;
                }

                // Skip rendering a dot for null-price (gap) points so
                // unavailable days have nothing hoverable.
                if (payload.price == null) {
                  return <g key={`dot-gap-${index}`} />;
                }

                const isActive = activeIndex === index;

                // Shared style to suppress the native browser focus
                // outline and text-selection highlight that SVG elements
                // can acquire on hover/click.
                const noSelect = {
                  outline: "none",
                  userSelect: "none" as const,
                  WebkitUserSelect: "none" as const,
                };

                return (
                  <g
                    key={`dot-${index}`}
                    onMouseEnter={() => handleDotEnter(index, cx, cy)}
                    onMouseLeave={handleDotLeave}
                    style={noSelect}
                  >
                    {/* Invisible outer circle — larger hit target (r=12)
                        so the user doesn't need pixel-perfect aim.
                        pointerEvents="all" ensures it captures the mouse
                        even though it is transparent. */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={12}
                      fill="transparent"
                      stroke="none"
                      pointerEvents="all"
                      style={{ ...noSelect, cursor: "pointer" }}
                    />
                    {/* Visible dot — grows from r=5 to r=7 on hover.
                        pointerEvents="none" so mouse events pass through
                        to the hit-target circle underneath, avoiding
                        double-fire of enter/leave. */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isActive ? 7 : 5}
                      fill="#0A6FB0"
                      stroke="none"
                      pointerEvents="none"
                      style={noSelect}
                    />
                  </g>
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Custom tooltip — rendered as an absolutely-positioned div
            inside the chart wrapper.  Only visible when activeIndex is
            set (i.e. the mouse is over a data dot).  Positioned near the
            active dot using the stored cx/cy pixel coordinates, offset
            upward so it floats above the dot. */}
        {activeIndex !== null && activeDotPos && chartData[activeIndex] && (() => {
          const point = chartData[activeIndex];
          const d = new Date(point.date + "T00:00:00Z");
          const formattedDate = tooltipDateFormatter.format(d);

          return (
            <div
              className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-sm z-10"
              style={{
                left: activeDotPos.cx,
                top: activeDotPos.cy - 10,
                transform: "translate(-50%, -100%)",
              }}
            >
              <p className="font-medium text-gray-900">{formattedDate}</p>
              {point.price != null ? (
                <>
                  <p className="text-price font-semibold">
                    €{point.price.toFixed(2)}
                  </p>
                  <p className="text-gray-500">{point.store}</p>
                </>
              ) : (
                <p className="text-red-600">{labels.unavailable}</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Sparse-data caption: shown when the chart is a single dot or a
          flat line, indicating that history collection has just started. */}
      {isSparse && (
        <p className="text-sm text-gray-400 mt-2">{labels.collectingHistory}</p>
      )}
    </div>
  );
}
