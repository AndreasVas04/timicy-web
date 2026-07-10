import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPriceAlertEmail } from "@/lib/email/resend";
import { buildProductSlug } from "@/lib/slug";

/**
 * POST /api/alerts/notify - price-alert notification dispatcher.
 *
 * Called by the nightly pipeline after fresh pricing data lands in Supabase.
 * For each confirmed subscription whose target price is met (and not notified
 * in the last 7 days), sends a localized email via Resend and marks the row
 * as notified. A hard cap of 25 sends per invocation keeps us well within
 * Resend's default rate limits; remaining rows are picked up on subsequent
 * nightly calls.
 *
 * Runtime: Node (default) - required for crypto.timingSafeEqual.
 * Max execution time: 60 seconds.
 *
 * Auth: Bearer token compared against ALERTS_CRON_SECRET using constant-time
 * comparison to prevent timing side-channel attacks.
 */

/** Maximum number of emails to send in a single invocation */
const SEND_CAP = 25;

/** Cooldown period: 7 days in milliseconds */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Delay between sends in milliseconds (stay under Resend rate limits) */
const SEND_DELAY_MS = 600;

/** Maximum number of IDs per Supabase .in() filter (PostgREST limit) */
const IN_CHUNK_SIZE = 100;

/** Number of rows to fetch per paginated request (PostgREST default max) */
const PAGE_SIZE = 1000;

/** Allow up to 60 seconds of execution time */
export const maxDuration = 60;

/* -------------------------------------------------------------------------- */
/*  Reject non-POST methods                                                   */
/* -------------------------------------------------------------------------- */

export function GET() {
  return NextResponse.json(
    { error: "method not allowed" },
    { status: 405, headers: { Allow: "POST" } }
  );
}

/* -------------------------------------------------------------------------- */
/*  POST handler                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    /* --- Validate server configuration ---------------------------------- */

    const secret = process.env.ALERTS_CRON_SECRET;
    if (!secret) {
      // Fail loud: a missing secret means the deployment is misconfigured.
      // Never silently allow unauthenticated calls.
      console.error(
        "ALERTS_CRON_SECRET is not set - POST /api/alerts/notify is disabled."
      );
      return NextResponse.json(
        { error: "server misconfiguration" },
        { status: 500 }
      );
    }

    /* --- Authenticate the caller ---------------------------------------- */

    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!constantTimeEqual(token, secret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    /* --- Step 1: Fetch due subscriptions -------------------------------- */
    // A subscription is "due" if it is confirmed and either has never been
    // notified or was last notified more than 7 days ago.

    const supabase = createAdminClient();

    const cutoffDate = new Date(Date.now() - COOLDOWN_MS);
    const cutoffIso = cutoffDate.toISOString();

    // Paginate through all due subscriptions using .range() since
    // PostgREST caps results at 1000 rows per request.
    interface DueSubscription {
      id: number;
      email: string;
      product_id: number;
      target_price: number;
      locale: string;
      unsubscribe_token: string;
    }

    const allDue: DueSubscription[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase
        .from("price_subscriptions")
        .select(
          "id, email, product_id, target_price, locale, unsubscribe_token"
        )
        .eq("confirmed", true)
        .or(
          `last_notified_at.is.null,last_notified_at.lt.${cutoffIso}`
        )
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Error fetching due subscriptions:", error);
        return NextResponse.json(
          { error: "database error" },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) break;

      allDue.push(...(data as DueSubscription[]));

      // If we got fewer rows than PAGE_SIZE, we've reached the last page
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    /* --- Early exit if no due subscriptions ----------------------------- */

    if (allDue.length === 0) {
      return NextResponse.json({ checked: 0, sent: 0 });
    }

    /* --- Step 2: Collect distinct product IDs --------------------------- */

    const productIds = [...new Set(allDue.map((s) => s.product_id))];

    /* --- Step 3: Fetch lowest available price per product ---------------- */
    // Query store_products for available offers with a non-null price.
    // Chunk the .in() filter to avoid exceeding PostgREST's parameter limit.

    interface StoreOffer {
      product_id: number;
      current_price: number;
      store: string;
    }

    const allOffers: StoreOffer[] = [];

    for (let i = 0; i < productIds.length; i += IN_CHUNK_SIZE) {
      const chunk = productIds.slice(i, i + IN_CHUNK_SIZE);
      let chunkOffset = 0;

      while (true) {
        const { data, error } = await supabase
          .from("store_products")
          .select("product_id, current_price, store")
          .in("product_id", chunk)
          .eq("available", true)
          .not("current_price", "is", null)
          .range(chunkOffset, chunkOffset + PAGE_SIZE - 1);

        if (error) {
          console.error("Error fetching store offers:", error);
          return NextResponse.json(
            { error: "database error" },
            { status: 500 }
          );
        }

        if (!data || data.length === 0) break;

        allOffers.push(...(data as StoreOffer[]));

        if (data.length < PAGE_SIZE) break;
        chunkOffset += PAGE_SIZE;
      }
    }

    // Compute the minimum price and corresponding store for each product
    const bestOfferByProduct = new Map<
      number,
      { minPrice: number; store: string }
    >();

    for (const offer of allOffers) {
      const existing = bestOfferByProduct.get(offer.product_id);
      if (!existing || offer.current_price < existing.minPrice) {
        bestOfferByProduct.set(offer.product_id, {
          minPrice: offer.current_price,
          store: offer.store,
        });
      }
    }

    /* --- Step 4: Fetch product titles ----------------------------------- */
    // Needed for the email subject/body and for building canonical product URLs.

    const productTitles = new Map<
      number,
      string
    >();

    for (let i = 0; i < productIds.length; i += IN_CHUNK_SIZE) {
      const chunk = productIds.slice(i, i + IN_CHUNK_SIZE);

      const { data, error } = await supabase
        .from("products")
        .select("id, canonical_title")
        .in("id", chunk);

      if (error) {
        console.error("Error fetching product titles:", error);
        return NextResponse.json(
          { error: "database error" },
          { status: 500 }
        );
      }

      if (data) {
        for (const row of data) {
          productTitles.set(row.id, row.canonical_title);
        }
      }
    }

    /* --- Step 5: Send alert emails -------------------------------------- */
    // For each due subscription where the current lowest price meets the
    // user's target, send an email. Stop after SEND_CAP sends.

    // Base URL for building product and unsubscribe links
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000"
    ).replace(/\/+$/, "");

    // Filter subscriptions to only those where price target is met
    const matched = allDue.filter((sub) => {
      const best = bestOfferByProduct.get(sub.product_id);
      return best && best.minPrice <= sub.target_price;
    });

    let sent = 0;
    let failed = 0;
    let attempted = 0;

    for (const sub of matched) {
      // Enforce per-invocation send cap
      if (attempted >= SEND_CAP) break;
      attempted++;

      const best = bestOfferByProduct.get(sub.product_id)!;
      const title = productTitles.get(sub.product_id);

      // Build the product URL using the canonical slug if we have the title,
      // otherwise fall back to the id-based form (x-p<ID>) which 308-redirects
      // to the canonical product URL.
      let productUrl: string;
      if (title) {
        const slug = buildProductSlug(sub.product_id, title);
        productUrl = `${appUrl}/${sub.locale}/product/${slug}`;
      } else {
        productUrl = `${appUrl}/${sub.locale}/product/x-p${sub.product_id}`;
      }

      // Build the unsubscribe URL using the row's existing token,
      // same pattern as the subscribe route.
      const unsubscribeUrl = `${appUrl}/${sub.locale}/alerts/unsubscribe?token=${sub.unsubscribe_token}`;

      // Send the price-alert email
      const result = await sendPriceAlertEmail({
        to: sub.email,
        locale: sub.locale,
        productTitle: title || `Product #${sub.product_id}`,
        targetPrice: sub.target_price,
        currentMinPrice: best.minPrice,
        storeName: best.store,
        productUrl,
        unsubscribeUrl,
      });

      if (result.success) {
        // Mark this subscription as notified. Per-row update (not batched)
        // ensures crash safety: if the process dies mid-loop, only rows
        // that actually received an email are marked.
        const { error: updateError } = await supabase
          .from("price_subscriptions")
          .update({ last_notified_at: new Date().toISOString() })
          .eq("id", sub.id);

        if (updateError) {
          console.error(
            `Failed to update last_notified_at for sub ${sub.id}:`,
            updateError
          );
        }

        sent++;
      } else {
        console.error(
          `Failed to send alert email to ${sub.email} for product ${sub.product_id}:`,
          result.error
        );
        failed++;
      }

      // Rate-limit delay between sends (skip after the last one)
      if (attempted < Math.min(matched.length, SEND_CAP)) {
        await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
      }
    }

    /* --- Step 6: Return summary ----------------------------------------- */
    // "remaining" tells the pipeline how many matched rows were not attempted
    // in this invocation due to the send cap. They'll be picked up next time.

    return NextResponse.json({
      checked: allDue.length,
      matched: matched.length,
      sent,
      failed,
      remaining: matched.length - attempted,
    });
  } catch (error) {
    // Log the full error server-side; return a generic 500 to the pipeline.
    // The pipeline treats non-200 as ALERTS FAILED, which is the correct signal.
    console.error("Unexpected error in /api/alerts/notify:", error);
    return NextResponse.json(
      { error: "internal server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  Constant-time string comparison                                           */
/* -------------------------------------------------------------------------- */

/**
 * Compare two strings in constant time to prevent timing side-channel
 * attacks. If the lengths differ we still run timingSafeEqual on padded
 * buffers so the response time doesn't leak the expected length.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // When lengths differ, compare bufA against itself so the operation
  // takes the same time, then return false unconditionally.
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
