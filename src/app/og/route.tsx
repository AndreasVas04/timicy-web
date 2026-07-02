import { ImageResponse } from "next/og";

// Static route — the banner never changes, so allow it to be cached indefinitely.
export const runtime = "edge";
export const dynamic = "force-static";

// Brand colors (from the TimiCY logo palette).
const NAVY = "#0A2540";
const TEAL = "#0BA4B4";

/**
 * GET /og — renders the 1200×630 social-share banner as a PNG.
 * Referenced by og.ts (OG_FALLBACK_IMAGE) and consumed by every page's
 * OpenGraph/Twitter metadata.
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: NAVY,
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark: "Timi" white + "CY" teal, matching the logo. */}
        <div style={{ display: "flex", fontSize: "140px", fontWeight: 700, letterSpacing: "-2px" }}>
          <span style={{ color: "#FFFFFF" }}>Timi</span>
          <span style={{ color: TEAL }}>CY</span>
        </div>
        {/* Tagline. */}
        <div style={{ marginTop: "24px", fontSize: "40px", color: "#9FB3C8" }}>
          Compare prices in Cyprus
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
