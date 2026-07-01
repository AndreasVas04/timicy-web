/**
 * Pure reconstruction of the "cheapest available price per day" time-series.
 *
 * This module contains NO I/O, no Supabase calls, and no implicit Date.now().
 * The current time ("now") is passed in as an argument so the function is
 * fully deterministic and easy to unit-test.
 *
 * The output is an array of PricePoint objects — one per distinct calendar day
 * observed across all offers, plus today — suitable for rendering as a line
 * chart.
 */

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** A single scraped event for one store-product (one row in price_history). */
export type OfferEvent = {
  price: number;
  available: boolean;
  recordedAt: string; // ISO-8601 timestamp string
};

/**
 * All known history for one store-product row, including its live state.
 * This is the shape that the data-fetching layer (queries/price-history.ts)
 * produces after mapping DB columns to camelCase.
 */
export type OfferSeries = {
  storeProductId: number;
  store: string;
  /** Live price from store_products.current_price (may be null). */
  currentPrice: number | null;
  /** Live availability from store_products.available. */
  currentAvailable: boolean;
  /** Historical price_history rows for this store-product. */
  events: OfferEvent[];
};

/**
 * One point on the cheapest-price time-series.
 * - price is null when no offer was available on that day (chart gap).
 * - store is null in the same gap case.
 */
export type PricePoint = {
  date: string; // "YYYY-MM-DD" UTC calendar day
  price: number | null;
  store: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Extract the UTC calendar day (YYYY-MM-DD) from an ISO-8601 timestamp.
 * This strips time-of-day jitter introduced by the scraper running across
 * a few seconds/minutes within a single nightly cron run.
 */
function toUTCDay(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/* -------------------------------------------------------------------------- */
/*  Core reconstruction                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Reconstruct the cheapest-available-price time-series from raw offer events.
 *
 * Algorithm (each step is commented inline):
 *
 * 1. Bucket every event to its UTC calendar day.
 * 2. Collect all distinct days, append today as the final day.
 * 3. Forward-fill each offer's state day-by-day.
 * 4. On the final day (today), override with live current state.
 * 5. Pick the cheapest available offer per day (gap if none).
 * 6. Return points sorted by date ascending.
 *
 * @param offers  All store-product rows with their price_history events.
 * @param now     The current time — injected for testability.
 * @returns       Sorted array of PricePoints, one per distinct day.
 */
export function reconstructCheapestSeries(
  offers: OfferSeries[],
  now: Date
): PricePoint[] {
  // ------------------------------------------------------------------
  // Step 1: Bucket every event's recordedAt to a UTC calendar day.
  //
  // The scraper writes all offers within one cron run seconds apart
  // (jitter), and the cron is nightly, so at most one real change per
  // offer per day.  Day-bucketing removes intra-run jitter losslessly.
  //
  // For each offer we build a Map<day, latestEvent> keeping only the
  // last event of each day (by original timestamp) so intra-day
  // duplicates are collapsed deterministically.
  // ------------------------------------------------------------------

  type DayEvent = { price: number; available: boolean; ts: number };

  const offerDayMaps: Map<string, DayEvent>[] = offers.map((offer) => {
    const dayMap = new Map<string, DayEvent>();
    for (const ev of offer.events) {
      const day = toUTCDay(ev.recordedAt);
      const ts = new Date(ev.recordedAt).getTime();
      const existing = dayMap.get(day);
      // Keep the latest event within each day (highest timestamp).
      if (!existing || ts > existing.ts) {
        dayMap.set(day, { price: ev.price, available: ev.available, ts });
      }
    }
    return dayMap;
  });

  // ------------------------------------------------------------------
  // Step 2: Build the sorted set of all distinct event-days across all
  // offers.  Append today's UTC day (from `now`) as the final day so
  // the chart line always extends to the present.
  // ------------------------------------------------------------------

  const today = toUTCDay(now.toISOString());
  const daySet = new Set<string>();
  for (const dayMap of offerDayMaps) {
    for (const day of dayMap.keys()) {
      daySet.add(day);
    }
  }
  daySet.add(today);

  // Sort days chronologically.
  const sortedDays = Array.from(daySet).sort();

  // ------------------------------------------------------------------
  // Steps 3–5: Walk through each day, forward-fill offer states, pick
  // the cheapest available offer.
  // ------------------------------------------------------------------

  const points: PricePoint[] = [];

  // Per-offer forward-fill accumulators: the latest known state for
  // each offer as we walk forward through the days.  null means the
  // offer has not appeared yet (no event on-or-before the current day).
  const latestState: (DayEvent | null)[] = offers.map(() => null);

  for (const day of sortedDays) {
    const isToday = day === today;

    // ------------------------------------------------------------------
    // Step 3: Forward-fill — update each offer's latest state if there
    // is an event on this day.  An offer with no event on-or-before
    // this day stays null (it doesn't exist yet and is excluded).
    // ------------------------------------------------------------------
    for (let i = 0; i < offers.length; i++) {
      const dayEvent = offerDayMaps[i].get(day);
      if (dayEvent) {
        latestState[i] = dayEvent;
      }
    }

    // ------------------------------------------------------------------
    // Step 4: On the final day (today), override each offer's
    // forward-filled state with its live currentPrice / currentAvailable.
    // This anchors the chart end to the best-price badge shown on the
    // page (which uses store_products.current_price).
    // ------------------------------------------------------------------
    type Candidate = { price: number; available: boolean; store: string };
    const candidates: Candidate[] = [];

    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];

      if (isToday) {
        // Use live state for today regardless of forward-fill.
        if (offer.currentPrice != null) {
          candidates.push({
            price: offer.currentPrice,
            available: offer.currentAvailable,
            store: offer.store,
          });
        }
      } else {
        // Use forward-filled historical state.
        const state = latestState[i];
        if (state) {
          candidates.push({
            price: state.price,
            available: state.available,
            store: offer.store,
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // Step 5: Among candidates that are available with a non-null price,
    // pick the minimum price.  Tie-break by store name alphabetically.
    // If no candidate qualifies -> gap point (price: null, store: null).
    // ------------------------------------------------------------------

    const eligible = candidates.filter((c) => c.available && c.price != null);

    if (eligible.length === 0) {
      points.push({ date: day, price: null, store: null });
    } else {
      // Sort by price ascending, then by store name alphabetically for
      // deterministic tie-breaking.
      eligible.sort((a, b) => a.price - b.price || a.store.localeCompare(b.store));
      points.push({ date: day, price: eligible[0].price, store: eligible[0].store });
    }
  }

  // ------------------------------------------------------------------
  // Step 6: Return points sorted by date ascending (already in order
  // because sortedDays was sorted, but this makes the contract explicit).
  // ------------------------------------------------------------------
  return points;
}
