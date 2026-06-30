import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import crypto from "node:crypto";

/**
 * POST /api/revalidate — on-demand cache revalidation receiver.
 *
 * Called by the scraper pipeline (GitHub Actions) after fresh data lands in
 * Supabase. Invalidates the Next.js Data Cache so subsequent requests
 * re-fetch from the database instead of serving stale catalog data.
 *
 * Runtime: Node (default) — required for crypto.timingSafeEqual.
 * We do NOT set `export const runtime = "edge"` because the Edge runtime
 * does not expose the full Node crypto module.
 *
 * Auth: the caller must send `Authorization: Bearer <REVALIDATE_SECRET>`.
 * The secret lives in a header (not a query parameter) so it never appears
 * in server logs, CDN access logs, or browser history.
 *
 * The comparison uses crypto.timingSafeEqual to prevent timing side-channel
 * attacks that could leak the secret byte-by-byte.
 *
 * Body contract (JSON, all fields optional):
 *   { tags?: string[], paths?: string[] }
 *
 * - tags: Next.js cache tags to invalidate (e.g. ["catalog"]).
 * - paths: URL paths to revalidate (e.g. ["/el", "/en"]).
 * - If BOTH are empty/absent: defaults to revalidateTag("catalog") plus
 *   revalidatePath("/", "layout") as a safety net that covers the home
 *   page and all layout-level data.
 *
 * Step 11 will start by POSTing an empty body (→ catalog + home); per-
 * product tags are a V1.5 optimization that can be added without changing
 * this endpoint.
 */

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
  /* --- Validate server configuration ------------------------------------ */

  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    // Fail loud: a missing secret means the deployment is misconfigured.
    // Never silently allow unauthenticated revalidation.
    console.error(
      "REVALIDATE_SECRET is not set — POST /api/revalidate is disabled."
    );
    return NextResponse.json(
      { error: "server misconfiguration" },
      { status: 500 }
    );
  }

  /* --- Authenticate the caller ------------------------------------------ */

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!constantTimeEqual(token, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* --- Parse the optional JSON body ------------------------------------- */

  let tags: string[] = [];
  let paths: string[] = [];

  try {
    const body = (await request.json()) as {
      tags?: string[];
      paths?: string[];
    };
    if (Array.isArray(body.tags)) tags = body.tags;
    if (Array.isArray(body.paths)) paths = body.paths;
  } catch {
    // Empty body or invalid JSON — fall through to defaults below.
  }

  /* --- Revalidate ------------------------------------------------------- */

  // Default behaviour when the caller sends no specific tags/paths:
  // flush the entire catalog cache and the home layout.
  if (tags.length === 0 && paths.length === 0) {
    revalidateTag("catalog");
    revalidatePath("/", "layout");
  } else {
    for (const tag of tags) {
      revalidateTag(tag);
    }
    for (const path of paths) {
      revalidatePath(path);
    }
  }

  return NextResponse.json({ revalidated: true, now: Date.now() });
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
