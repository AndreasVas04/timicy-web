import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken } from "@/lib/tokens";
import { sendActivationEmail } from "@/lib/email/resend";

/* -------------------------------------------------------------------------- */
/*  In-memory per-IP rate limiter (V1)                                        */
/*  Tracks the timestamps of recent subscribe requests per IP.                */
/*  Max 5 requests per IP in a sliding 10-minute window.                      */
/*  On exceed: return the same generic success (no leak that limit was hit).  */
/* -------------------------------------------------------------------------- */

const IP_RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const IP_RATE_MAX = 5;

/** Map from IP address to an array of request timestamps (ms) */
const ipRequestLog = new Map<string, number[]>();

/**
 * Check whether the given IP has exceeded the rate limit.
 * Also prunes expired entries from the map to prevent unbounded growth.
 */
function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestLog.get(ip) ?? [];

  // Remove timestamps outside the sliding window
  const recent = timestamps.filter((t) => now - t < IP_RATE_WINDOW_MS);

  if (recent.length >= IP_RATE_MAX) {
    // Still over limit — update map with pruned list and reject
    ipRequestLog.set(ip, recent);
    return true;
  }

  // Record this request and allow it
  recent.push(now);
  ipRequestLog.set(ip, recent);
  return false;
}

/* -------------------------------------------------------------------------- */
/*  In-memory per-EMAIL rate limiter                                          */
/*  Guards against abuse where someone subscribes a victim's email to many    */
/*  products (spam via activation emails). The same normalized email may      */
/*  subscribe to at most 10 DISTINCT products within a 60-minute sliding      */
/*  window. Each timestamp represents one successful subscribe request.       */
/*  On exceed: return the same generic success (no leak that limit was hit).  */
/* -------------------------------------------------------------------------- */

const EMAIL_RATE_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
const EMAIL_RATE_MAX = 10;

/** Map from normalized email to an array of request timestamps (ms) */
const emailRequestLog = new Map<string, number[]>();

/**
 * Check whether the given email has exceeded the per-email rate limit.
 * Works identically to the per-IP limiter: sliding window, prune on check.
 */
function isEmailRateLimited(email: string): boolean {
  const now = Date.now();
  const timestamps = emailRequestLog.get(email) ?? [];

  // Remove timestamps outside the sliding window
  const recent = timestamps.filter((t) => now - t < EMAIL_RATE_WINDOW_MS);

  if (recent.length >= EMAIL_RATE_MAX) {
    // Still over limit — update map with pruned list and reject
    emailRequestLog.set(email, recent);
    return true;
  }

  // Record this request and allow it
  recent.push(now);
  emailRequestLog.set(email, recent);
  return false;
}

/* -------------------------------------------------------------------------- */
/*  Request body type                                                         */
/* -------------------------------------------------------------------------- */

interface SubscribeBody {
  email: string;
  productId: number;
  targetPrice: number;
  locale: string;
  /** Honeypot field — should always be empty for real users */
  website: string;
}

/* -------------------------------------------------------------------------- */
/*  Generic success response factory (always the same body, to prevent        */
/*  enumeration). This must be a function, not a module-level constant,       */
/*  because a Response body can only be consumed once — reusing a single      */
/*  NextResponse object across concurrent requests would cause a              */
/*  "body already used" error on the second caller.                           */
/* -------------------------------------------------------------------------- */

const successResponse = () =>
  NextResponse.json(
    { ok: true, message: "If that email is valid, you will receive a confirmation link shortly." },
    { status: 200 }
  );

/* -------------------------------------------------------------------------- */
/*  POST /api/alerts/subscribe                                                */
/*  Creates or updates a price alert subscription (single opt-in — the alert  */
/*  is active immediately) and sends an activation email. Uses UPSERT on      */
/*  (email, product_id) to enforce one subscription per pair.                 */
/* -------------------------------------------------------------------------- */

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubscribeBody;
    const { email, productId, targetPrice, locale, website } = body;

    /* --- Honeypot check -------------------------------------------------- */
    // If the hidden "website" field is filled in, a bot submitted the form.
    // Silently return success without doing anything.
    if (website) {
      return successResponse();
    }

    /* --- Per-IP rate limiting -------------------------------------------- */
    // Read the client IP from the x-forwarded-for header (set by reverse proxies).
    // Fall back to "unknown" if the header is missing.
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    if (isIpRateLimited(ip)) {
      // Over the limit — return the same generic success to avoid revealing the limit
      return successResponse();
    }

    /* --- Input validation ------------------------------------------------ */
    // Basic email format check (intentionally lenient; delivery will verify).
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = (email ?? "").trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail)) {
      return successResponse(); // Invalid email — generic success (no enumeration)
    }

    if (typeof targetPrice !== "number" || targetPrice <= 0 || !Number.isFinite(targetPrice)) {
      return successResponse();
    }

    if (locale !== "el" && locale !== "en") {
      return successResponse();
    }

    if (typeof productId !== "number" || productId <= 0 || !Number.isInteger(productId)) {
      return successResponse();
    }

    /* --- Per-email rate limiting ----------------------------------------- */
    // Checked after input validation so we don't record invalid requests.
    // Guards against someone subscribing a victim's email to many products,
    // which would cause a flood of activation emails to that address.
    if (isEmailRateLimited(normalizedEmail)) {
      return successResponse();
    }

    /* --- Look up the product (verify it exists) -------------------------- */
    const supabase = createAdminClient();

    const { data: product } = await supabase
      .from("products")
      .select("id, canonical_title")
      .eq("id", productId)
      .single();

    if (!product) {
      // Product doesn't exist — return generic success (no enumeration)
      return successResponse();
    }

    /* --- Check for an existing subscription row -------------------------- */
    // If a row already exists for (email, product_id), reuse its unsubscribe_token
    // so the user's existing unsubscribe link continues to work.
    const { data: existingRow } = await supabase
      .from("price_subscriptions")
      .select("unsubscribe_token")
      .eq("email", normalizedEmail)
      .eq("product_id", productId)
      .maybeSingle();

    const unsubscribeToken = existingRow?.unsubscribe_token ?? generateToken();

    /* --- UPSERT the subscription ---------------------------------------- */
    // Single opt-in: the alert is active immediately (confirmed=true).
    // confirmation_token is set to null — no confirmation step exists.
    // On conflict (email, product_id): update target_price, set confirmed=true,
    // clear confirmation_token, keep the existing unsubscribe_token, update locale.
    const { error: upsertError } = await supabase
      .from("price_subscriptions")
      .upsert(
        {
          email: normalizedEmail,
          product_id: productId,
          target_price: targetPrice,
          locale,
          confirmed: true,
          confirmation_token: null,
          unsubscribe_token: unsubscribeToken,
          // confirmed_at: set to now() on insert. On re-subscribe (upsert update),
          // this refreshes the timestamp, which is fine — it reflects the latest activation.
          confirmed_at: new Date().toISOString(),
          // Note: created_at is intentionally omitted. The column has a DB
          // default of now() which handles fresh inserts. Including it here
          // would overwrite the original creation timestamp on re-subscribes
          // (the upsert update path), and we want that value to stay stable.
        },
        { onConflict: "email,product_id" }
      );

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return successResponse(); // Fail silently from the user's perspective
    }

    /* --- Build the unsubscribe URL -------------------------------------- */
    // No confirmUrl needed — single opt-in means no confirmation step.
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000"
    ).replace(/\/+$/, ""); // Strip trailing slashes

    const unsubscribeUrl = `${appUrl}/${locale}/alerts/unsubscribe?token=${unsubscribeToken}`;

    /* --- Send the activation email -------------------------------------- */
    // Informs the user their alert is now active and includes an unsubscribe link.
    await sendActivationEmail({
      to: normalizedEmail,
      locale,
      productTitle: product.canonical_title,
      targetPrice,
      unsubscribeUrl,
    });

    return successResponse();
  } catch (error) {
    // Log the error server-side for debugging but never expose details to the client
    console.error("Subscribe error:", error);
    return successResponse();
  }
}
