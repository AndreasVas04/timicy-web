/**
 * Unit tests for reconstructCheapestSeries.
 *
 * Each test case is derived from real production data patterns.
 * The reconstruction function is pure (no I/O, deterministic), so these
 * tests exercise it directly with in-memory OfferSeries arrays.
 */

import { describe, it, expect } from "vitest";
import {
  reconstructCheapestSeries,
  OfferSeries,
} from "./reconstruct";

/* -------------------------------------------------------------------------- */
/*  A. SINGLE POINT / FLAT-TO-NOW                                            */
/*                                                                            */
/*  One offer, one event on 2026-06-24 @ 899 available.                       */
/*  now = 2026-06-28.                                                         */
/*  Expect: first point 2026-06-24 @ 899 store X, last point 2026-06-28 @    */
/*  899 store X (flat line extended to now via forward-fill).                  */
/* -------------------------------------------------------------------------- */

describe("A. Single point / flat-to-now", () => {
  const offers: OfferSeries[] = [
    {
      storeProductId: 1,
      store: "storeX",
      currentPrice: 899,
      currentAvailable: true,
      events: [
        { price: 899, available: true, recordedAt: "2026-06-24T03:12:00Z" },
      ],
    },
  ];

  const now = new Date("2026-06-28T12:00:00Z");
  const points = reconstructCheapestSeries(offers, now);

  it("first point is the event day with price 899 from storeX", () => {
    expect(points[0]).toEqual({ date: "2026-06-24", price: 899, store: "storeX" });
  });

  it("last point is today (2026-06-28) with price 899 from storeX", () => {
    expect(points[points.length - 1]).toEqual({
      date: "2026-06-28",
      price: 899,
      store: "storeX",
    });
  });

  it("all intermediate days are forward-filled at 899", () => {
    // Days: 2026-06-24, 2026-06-28 (only event day + today since no
    // events exist on 25/26/27 — those days have no events from any
    // offer, so they are not in the distinct-day set).
    for (const p of points) {
      expect(p.price).toBe(899);
      expect(p.store).toBe("storeX");
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  B. AVAILABILITY ATTRIBUTION (real case, product 57839)                    */
/*                                                                            */
/*  Two offers same price 899 — istorm available=true, public available=false */
/*  — plus kotsovolos 979 available=true, all events on 2026-06-24.           */
/*  now = 2026-06-24.                                                         */
/*  Expect the point = price 899, store "istorm" (NOT "public", because       */
/*  public is unavailable and must be excluded from candidates).              */
/* -------------------------------------------------------------------------- */

describe("B. Availability attribution (product 57839 pattern)", () => {
  const offers: OfferSeries[] = [
    {
      storeProductId: 10,
      store: "istorm",
      currentPrice: 899,
      currentAvailable: true,
      events: [
        { price: 899, available: true, recordedAt: "2026-06-24T02:00:00Z" },
      ],
    },
    {
      storeProductId: 11,
      store: "public",
      currentPrice: 899,
      currentAvailable: false,
      events: [
        { price: 899, available: false, recordedAt: "2026-06-24T02:01:00Z" },
      ],
    },
    {
      storeProductId: 12,
      store: "kotsovolos",
      currentPrice: 979,
      currentAvailable: true,
      events: [
        { price: 979, available: true, recordedAt: "2026-06-24T02:02:00Z" },
      ],
    },
  ];

  const now = new Date("2026-06-24T12:00:00Z");
  const points = reconstructCheapestSeries(offers, now);

  it("picks istorm at 899 (not public, which is unavailable)", () => {
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({ date: "2026-06-24", price: 899, store: "istorm" });
  });
});

/* -------------------------------------------------------------------------- */
/*  C. ALL-UNAVAILABLE GAP                                                    */
/*                                                                            */
/*  Single day where every existing offer has available=false.                 */
/*  Expect that day's point = { price: null, store: null }.                   */
/* -------------------------------------------------------------------------- */

describe("C. All-unavailable gap", () => {
  const offers: OfferSeries[] = [
    {
      storeProductId: 20,
      store: "alpha",
      currentPrice: 500,
      currentAvailable: false,
      events: [
        { price: 500, available: false, recordedAt: "2026-06-20T01:00:00Z" },
      ],
    },
    {
      storeProductId: 21,
      store: "beta",
      currentPrice: 600,
      currentAvailable: false,
      events: [
        { price: 600, available: false, recordedAt: "2026-06-20T01:05:00Z" },
      ],
    },
  ];

  // now is the same day as the events, so today = event day.
  const now = new Date("2026-06-20T12:00:00Z");
  const points = reconstructCheapestSeries(offers, now);

  it("produces a gap point when all offers are unavailable", () => {
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({ date: "2026-06-20", price: null, store: null });
  });
});

/* -------------------------------------------------------------------------- */
/*  D. MIN-SWITCH BETWEEN STORES OVER TIME                                    */
/*                                                                            */
/*  Offer A is cheaper on day 1, offer B drops below A on day 2.              */
/*  Expect day1.store = A, day2.store = B, with the correct min each day.     */
/* -------------------------------------------------------------------------- */

describe("D. Min-switch between stores over time", () => {
  const offers: OfferSeries[] = [
    {
      storeProductId: 30,
      store: "alphaStore",
      currentPrice: 700,
      currentAvailable: true,
      events: [
        { price: 500, available: true, recordedAt: "2026-06-10T01:00:00Z" },
        // Price increases on day 2.
        { price: 700, available: true, recordedAt: "2026-06-11T01:00:00Z" },
      ],
    },
    {
      storeProductId: 31,
      store: "betaStore",
      currentPrice: 400,
      currentAvailable: true,
      events: [
        { price: 800, available: true, recordedAt: "2026-06-10T01:00:00Z" },
        // Price drops below alphaStore on day 2.
        { price: 400, available: true, recordedAt: "2026-06-11T01:00:00Z" },
      ],
    },
  ];

  // now = day 2 so live override applies on 2026-06-11.
  const now = new Date("2026-06-11T12:00:00Z");
  const points = reconstructCheapestSeries(offers, now);

  it("day 1 picks alphaStore at 500 (cheaper than betaStore 800)", () => {
    expect(points[0]).toEqual({ date: "2026-06-10", price: 500, store: "alphaStore" });
  });

  it("day 2 picks betaStore at 400 (cheaper than alphaStore 700)", () => {
    expect(points[1]).toEqual({ date: "2026-06-11", price: 400, store: "betaStore" });
  });
});

/* -------------------------------------------------------------------------- */
/*  E. TIE-BREAK                                                              */
/*                                                                            */
/*  Two available offers, identical price, different stores.                   */
/*  Expect deterministic alphabetical store pick.                              */
/* -------------------------------------------------------------------------- */

describe("E. Tie-break (alphabetical store)", () => {
  const offers: OfferSeries[] = [
    {
      storeProductId: 40,
      store: "zebra",
      currentPrice: 300,
      currentAvailable: true,
      events: [
        { price: 300, available: true, recordedAt: "2026-06-15T01:00:00Z" },
      ],
    },
    {
      storeProductId: 41,
      store: "alpha",
      currentPrice: 300,
      currentAvailable: true,
      events: [
        { price: 300, available: true, recordedAt: "2026-06-15T01:00:00Z" },
      ],
    },
  ];

  const now = new Date("2026-06-15T12:00:00Z");
  const points = reconstructCheapestSeries(offers, now);

  it("picks alphabetically first store (alpha) when prices tie", () => {
    expect(points).toHaveLength(1);
    expect(points[0]).toEqual({ date: "2026-06-15", price: 300, store: "alpha" });
  });
});
