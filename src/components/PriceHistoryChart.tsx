"use client";

/**
 * PriceHistoryChart — client component that renders the cheapest-price
 * time-series as a financial-style step-area chart ("Ledger sheet, market
 * precision" treatment of the Price Ledger design system).
 *
 * Visual anatomy, top to bottom, all inside ONE white sheet card:
 *   1. Header strip — current (last visible) price set loud in the heading
 *      face with tabular figures, a range-window delta underneath, and the
 *      time-range segmented control on the right.
 *   2. Plot area — teal step line with a gradient area fill fading to
 *      transparent, horizontal-only fine dashed hairlines (ledger rules),
 *      the price axis on the RIGHT (trading-chart convention), sparse muted
 *      calendar ticks on the X axis, a dashed lowest-price reference line,
 *      and a crosshair + navy mini-plate tooltip on hover.
 *
 * All user-facing strings are passed in via the `labels` prop (translated
 * server-side), so this component contains NO hardcoded EL/EN text and does
 * NOT import any next-intl hooks. It is a pure presentational client component.
 */

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { PricePoint } from "@/lib/price-history/reconstruct";

/* -------------------------------------------------------------------------- */
/*  Chart colors                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Token-matched hex values for SVG presentation attributes.
 * SVG attributes cannot resolve CSS custom properties (var(--...)), so these
 * literals mirror the @theme tokens in globals.css exactly — this is the
 * documented token exception for charts. If a token changes there, update
 * the matching value here.
 */
const COLOR_BRAND = "#0BA4B4"; // --color-brand  (teal line, fill, markers)
const COLOR_LINE = "#DDE4EB"; //  --color-line   (hairline gridlines)
const COLOR_FAINT = "#7C8DA1"; // --color-faint  (axis labels, crosshair)

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
/*  Helpers: nice price scale (Y axis)                                        */
/* -------------------------------------------------------------------------- */

/**
 * Round a raw step size UP to a "nice" human number: 1, 2, 2.5 or 5 times a
 * power of ten (…, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, …).  Finance
 * charts always label round price levels; Recharts' auto domain would
 * happily produce ticks like €123.37, which instantly reads as a default
 * chart. This is the core of the hand-rolled scale below.
 */
function niceStep(rough: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  if (frac <= 1) return pow;
  if (frac <= 2) return 2 * pow;
  if (frac <= 2.5) return 2.5 * pow;
  if (frac <= 5) return 5 * pow;
  return 10 * pow;
}

/**
 * Build the Y-axis domain and tick values from the visible prices.
 *
 * Two cases:
 *  - FLAT series (min === max, common when a price never moved): center the
 *    line vertically with two nice steps of headroom on each side, so a
 *    flat price reads as a deliberate horizontal rule across the middle of
 *    the sheet rather than a line glued to the chart floor.
 *  - Normal series: pad ~12% beyond min/max so the line never touches the
 *    plot edges, then place ticks on nice round multiples inside the domain.
 *
 * The domain never goes below zero (prices cannot be negative).
 */
function buildPriceScale(prices: number[]): {
  domain: [number, number];
  ticks: number[];
  /** Decimals to use when formatting axis labels (0 for whole-euro steps). */
  tickDecimals: number;
} {
  // Degenerate guard: no visible prices (all-unavailable range).
  if (prices.length === 0) {
    return { domain: [0, 1], ticks: [], tickDecimals: 0 };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  let step: number;
  let lo: number;
  let hi: number;

  if (min === max) {
    // Flat series: two nice steps of air above and below the value.
    step = niceStep(Math.max(0.5, min * 0.05));
    lo = Math.max(0, min - 2 * step);
    hi = max + 2 * step;
  } else {
    // Normal series: nice step from the span, ~12% padding on both sides.
    const span = max - min;
    step = niceStep(span / 3);
    const pad = span * 0.12;
    lo = Math.max(0, min - pad);
    hi = max + pad;
  }

  // Place ticks on round multiples of the step inside [lo, hi].
  // Round to cents to kill floating-point crumbs (e.g. 2.5000000000000004).
  const ticks: number[] = [];
  let t = Math.ceil(lo / step) * step;
  while (t <= hi + 1e-9) {
    ticks.push(Math.round(t * 100) / 100);
    t += step;
  }

  // Whole-euro steps get integer labels ("€850"); sub-euro steps keep cents.
  const tickDecimals = Number.isInteger(step) ? 0 : 2;

  return { domain: [lo, hi], ticks, tickDecimals };
}

/* -------------------------------------------------------------------------- */
/*  Enriched data point with a numeric timestamp for the time-scale axis      */
/* -------------------------------------------------------------------------- */

type ChartPoint = PricePoint & { ts: number };

/* -------------------------------------------------------------------------- */
/*  Tooltip content (navy mini price plate)                                   */
/* -------------------------------------------------------------------------- */

/**
 * Custom tooltip body — a miniature navy price plate echoing the page's main
 * price treatment: muted date line on top, the price loud in white with
 * tabular figures, the store attribution quiet underneath. Replaces the
 * default white Recharts box entirely.
 *
 * Recharts calls this with `active` + `payload`; the full ChartPoint rides
 * along as payload[0].payload. Positioning follows the cursor (Recharts
 * default), paired with a dashed vertical crosshair via the `cursor` prop.
 */
function PlateTooltip({
  active,
  payload,
  dateFormatter,
  unavailableLabel,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  dateFormatter: Intl.DateTimeFormat;
  unavailableLabel: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload;
  const formattedDate = dateFormatter.format(new Date(point.date + "T00:00:00Z"));

  return (
    <div className="rounded-md bg-ink px-3 py-2 shadow-lg">
      {/* Date line — small and muted, like the plate's caption text. */}
      <p className="whitespace-nowrap text-[11px] text-ink-soft">{formattedDate}</p>
      {point.price != null ? (
        <>
          {/* The price is the loudest element, even inside a tooltip. */}
          <p className="price-figure text-base font-extrabold text-white">
            €{point.price.toFixed(2)}
          </p>
          {/* Which store held the cheapest price that day. */}
          {point.store && <p className="text-[11px] text-ink-soft">{point.store}</p>}
        </>
      ) : (
        // Gap day: every store was out of stock.
        <p className="text-xs text-red-300">{unavailableLabel}</p>
      )}
    </div>
  );
}

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

  // --- Tooltip date formatter — full "d MMM yyyy" precision. --------------
  const tooltipDateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }),
    [locale]
  );

  // --- Visible (non-null) prices drive the price scale, the header
  //     figures, the delta and the lowest-price reference line. ------------
  const visiblePrices = useMemo(
    () => filtered.filter((p) => p.price !== null).map((p) => p.price!),
    [filtered]
  );

  // --- Hand-rolled Y scale: padded domain + nice round tick values. ------
  const { domain: yDomain, ticks: yTicks, tickDecimals } = useMemo(
    () => buildPriceScale(visiblePrices),
    [visiblePrices]
  );

  // --- Empty state: render nothing and let the parent handle it.
  //     This check is placed after all hooks so React's rules-of-hooks
  //     invariant is satisfied (hooks must not be called conditionally). ---
  if (points.length === 0) return null;

  // --- Sparse-data detection: show a "collecting history" caption when
  //     the visible chart is a single dot or a flat line.  Based on the
  //     `filtered` array (not the full `points`) so the caption matches
  //     what the user actually sees in the selected range. ----------------
  const isSparse =
    filtered.length === 1 ||
    (visiblePrices.length > 0 && new Set(visiblePrices).size === 1);

  // --- Header figures: last visible price ("current") and the delta
  //     against the first visible price of the selected window — the
  //     current-vs-first movement a trader expects at a glance. ------------
  const firstPrice = filtered.find((p) => p.price !== null)?.price ?? null;
  const lastPrice =
    [...filtered].reverse().find((p) => p.price !== null)?.price ?? null;

  // Delta only makes sense with two distinct observations to compare.
  const delta =
    firstPrice !== null && lastPrice !== null && visiblePrices.length >= 2
      ? lastPrice - firstPrice
      : null;
  const deltaPct = delta !== null && firstPrice ? (delta / firstPrice) * 100 : null;

  // Buyer semantics, not trader semantics: a FALLING price is good news on
  // a price-comparison site, so drops are green (stock token) and rises use
  // the same red the page uses for out-of-stock. Flat stays muted.
  const deltaColor =
    delta === null || delta === 0
      ? "text-mute"
      : delta < 0
        ? "text-stock"
        : "text-red-600";

  // Direction glyph: ▼ for a drop, ▲ for a rise, ± for no movement.
  const deltaGlyph = delta === null || delta === 0 ? "±" : delta < 0 ? "▼" : "▲";

  // --- Lowest visible price: drawn as a dashed teal reference line, the
  //     quiet "historic low" marker. Skipped for flat series (the whole
  //     line IS the low) and for very short histories (too little context).
  const minPrice = visiblePrices.length > 0 ? Math.min(...visiblePrices) : null;
  const showLowLine =
    minPrice !== null && visiblePrices.length >= 3 && !isSparse;

  // --- Observation dots: with daily data over months, dots on every point
  //     read as noise, so they only appear on short histories where each
  //     nightly observation deserves emphasis. ------------------------------
  const showDots = visiblePrices.length <= 14;

  /** Format an epoch-ms timestamp for X-axis tick labels (span-aware). */
  const formatTick = (ts: number) => axisDateFormatter.format(new Date(ts));

  /** Format Y-axis tick values as round euro levels ("€850" / "€8.50"). */
  const formatPrice = (value: number) => `€${value.toFixed(tickDecimals)}`;

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
      {/* The whole chart lives on ONE white sheet: header strip on top,
          plot area below. The plot wrapper has a FIXED height (280px) so
          the lazy-loading placeholder can mirror it exactly and nothing
          shifts when the Recharts chunk lands. */}
      <div className="rounded-lg border border-line bg-surface">
        {/* ------------------------------------------------------------------
            Header strip: current price + range delta on the left, the
            time-range segmented control on the right. flex-wrap stacks
            them into two rows on narrow (375px) screens. */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-4 pt-4 sm:px-5">
          <div>
            {/* Current price: the last visible price of the selected window.
                Set in the site's price voice — heading face, extrabold,
                tabular figures — so it stays the loudest element. */}
            {lastPrice !== null && (
              <p className="price-figure text-2xl font-extrabold leading-8 text-ink">
                €{lastPrice.toFixed(2)}
              </p>
            )}
            {/* Delta vs the first price of the window: glyph + absolute
                change + percentage. Green when the price dropped (good for
                buyers), red when it rose, muted when flat. */}
            {delta !== null && deltaPct !== null && (
              <p className={`mt-0.5 text-xs font-medium tabular-nums ${deltaColor}`}>
                <span aria-hidden="true">{deltaGlyph}</span> €
                {Math.abs(delta).toFixed(2)} ({delta > 0 ? "+" : delta < 0 ? "-" : ""}
                {Math.abs(deltaPct).toFixed(1)}%)
              </p>
            )}
          </div>

          {/* Time-range toggle: same segmented-control language as the sort
              control on category pages (one bordered box, hairline
              dividers), sized down to sit quietly in the card header. */}
          <div className="inline-flex divide-x divide-line overflow-hidden rounded-md border border-line bg-surface">
            {rangeButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setRange(key)}
                className={`px-2.5 py-1.5 text-xs transition-colors ${
                  range === key
                    ? "bg-ink font-medium text-white"
                    : "text-mute hover:bg-page hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------------------------
            Plot area. Fixed 280px height: prevents ResponsiveContainer from
            collapsing to 0px inside flex/grid parents AND guarantees zero
            layout shift against the lazy placeholder.
            The arbitrary-variant class applies tabular figures to all SVG
            axis labels so euro amounts align like everywhere else on site. */}
        <div className="h-[280px] w-full pt-3 [&_.recharts-cartesian-axis-tick_text]:tabular-nums">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              // left margin gives the first (edge-anchored) date label room;
              // bottom margin keeps date labels off the card's rounded edge.
              margin={{ top: 8, right: 0, bottom: 8, left: 14 }}
            >
              {/* Gradient for the area fill: brand teal fading to fully
                  transparent — gives the line "weight" the way Coinbase and
                  Google Finance charts do, without a solid color block. */}
              <defs>
                <linearGradient id="priceHistoryFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLOR_BRAND} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={COLOR_BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Gridlines: HORIZONTAL only, finely dashed hairlines — the
                  ledger-rule motif. Vertical lines are off so the sheet
                  reads as ruled paper, not a cage. */}
              <CartesianGrid
                horizontal
                vertical={false}
                stroke={COLOR_LINE}
                strokeDasharray="3 5"
              />

              {/* X-axis: numeric time scale using epoch-ms timestamps.
                  We use type="number" with scale="time" instead of a
                  categorical string axis because Recharts' categorical axis
                  can only render ticks at values that exist as data points.
                  A numeric time axis accepts any tick position, so we can
                  place them on clean calendar boundaries (1st-of-month,
                  Jan-1, etc.) regardless of where data points fall.
                  Axis line and tick marks are removed; the labels alone,
                  small and faint, do the work. */}
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                ticks={axisTicks}
                tickFormatter={formatTick}
                tick={{ fontSize: 11, fill: COLOR_FAINT }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />

              {/* Y-axis: price levels on the RIGHT, the trading-chart
                  convention (the newest data hugs the axis you read).
                  Domain and ticks come from buildPriceScale so labels are
                  always round euro levels, never €123.37 artifacts. */}
              <YAxis
                orientation="right"
                domain={yDomain}
                ticks={yTicks}
                tickFormatter={formatPrice}
                tick={{ fontSize: 11, fill: COLOR_FAINT }}
                axisLine={false}
                tickLine={false}
                tickMargin={6}
                width={52}
              />

              {/* Hover layer: a dashed vertical crosshair (cursor) plus the
                  navy mini-plate tooltip. Recharts snaps to the nearest
                  point horizontally, which is exactly how finance charts
                  behave when hovering between daily observations. */}
              <Tooltip
                cursor={{ stroke: COLOR_FAINT, strokeDasharray: "4 4", strokeWidth: 1 }}
                isAnimationActive={false}
                content={
                  <PlateTooltip
                    dateFormatter={tooltipDateFormatter}
                    unavailableLabel={labels.unavailable}
                  />
                }
              />

              {/* Lowest-price reference: a dashed teal rule at the minimum
                  visible price with a small price label above its left end.
                  The quiet "this is the low" marker traders look for. */}
              {showLowLine && (
                <ReferenceLine
                  y={minPrice!}
                  stroke={COLOR_BRAND}
                  strokeDasharray="4 4"
                  strokeOpacity={0.55}
                  label={{
                    value: `€${minPrice!.toFixed(2)}`,
                    position: "insideBottomLeft",
                    fill: COLOR_BRAND,
                    fontSize: 10,
                    dy: -4,
                  }}
                />
              )}

              {/* Price series: stepAfter matches the forward-fill semantics
                  (a price holds until the next change), and a step line
                  makes sparse daily data look intentional instead of
                  jagged. connectNulls=false so all-unavailable stretches
                  render as visible breaks. isAnimationActive=false removes
                  the entrance animation that feels laggy on sparse series.
                  Dots mark individual nightly observations only on short
                  histories (see showDots); the hover activeDot is a teal
                  disc with a white ring, matching the crosshair. */}
              <Area
                type="stepAfter"
                dataKey="price"
                stroke={COLOR_BRAND}
                strokeWidth={2}
                fill="url(#priceHistoryFill)"
                connectNulls={false}
                isAnimationActive={false}
                dot={showDots ? { r: 3, fill: COLOR_BRAND, strokeWidth: 0 } : false}
                activeDot={{ r: 4.5, fill: COLOR_BRAND, stroke: "#FFFFFF", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sparse-data caption: shown when the chart is a single dot or a
          flat line, indicating that history collection has just started. */}
      {isSparse && (
        <p className="text-sm text-faint mt-2">{labels.collectingHistory}</p>
      )}
    </div>
  );
}
