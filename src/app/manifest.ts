/**
 * Web app manifest — served at /manifest.webmanifest by Next.js.
 *
 * Provides metadata for browsers and mobile OSes: app name, colors,
 * icons, and display preferences. Referenced automatically by Next.js
 * when placed at src/app/manifest.ts (Metadata File convention).
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TimiCY",
    short_name: "TimiCY",
    description: "Compare prices on electronics and appliances from Cypriot stores.",
    start_url: "/",
    display: "browser",
    /* Page background — matches the --color-page design token (#F7F8FA). */
    background_color: "#F7F8FA",
    /* Theme color — matches the --color-ink design token (#0A2540). */
    theme_color: "#0A2540",
    icons: [
      {
        /* Existing favicon served by Next.js from src/app/favicon.ico. */
        src: "/favicon.ico",
        sizes: "16x16 32x32",
        type: "image/x-icon",
      },
      {
        /* Apple touch icon generated from the logo (180×180 PNG). */
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
