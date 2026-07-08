/**
 * Root-level 404 catch-all for paths that fall outside the [locale]
 * segment (e.g. /xyz-nonexistent, /foo/bar).
 *
 * Because this page renders outside the locale layout and the next-intl
 * provider, it cannot use useTranslations() or server-side getTranslations().
 * Instead it renders a self-contained HTML page with inline styles matching
 * the site's design tokens, defaulting to the Greek locale (the site's
 * primary language) for copy.
 *
 * The middleware redirects most valid locale-prefixed paths before they
 * reach here, so this page is hit mainly by bots and mistyped URLs.
 */

import { routing } from "@/i18n/routing";

export default function RootNotFound() {
  /* Default to the site's primary locale for the HTML lang attribute. */
  const locale = routing.defaultLocale;

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F8FA" /* --color-page */,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, sans-serif",
          color: "#374151",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            textAlign: "center",
            backgroundColor: "#FFFFFF" /* --color-surface */,
            border: "1px solid #E4E7EB" /* --color-line */,
            borderRadius: "0.75rem",
            padding: "2rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {/* Large 404 indicator. */}
          <p
            style={{
              fontSize: "3.75rem",
              fontWeight: 700,
              color: "#E4E7EB",
              marginBottom: "1rem",
              lineHeight: 1,
            }}
          >
            404
          </p>

          {/* Greek heading (primary locale). */}
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#0A2540" /* --color-ink */,
              marginBottom: "0.75rem",
            }}
          >
            Η σελίδα δεν βρέθηκε
          </h1>

          {/* Greek body text. */}
          <p style={{ color: "#6B7280", marginBottom: "1.5rem" }}>
            Η σελίδα που ψάχνεις δεν υπάρχει ή έχει μετακινηθεί.
          </p>

          {/* Link back to the Greek homepage. */}
          <a
            href={`/${locale}`}
            style={{
              display: "inline-block",
              padding: "0.625rem 1.5rem",
              backgroundColor: "#0BA4B4" /* --color-brand */,
              color: "#FFFFFF",
              fontSize: "0.875rem",
              fontWeight: 500,
              borderRadius: "0.5rem",
              textDecoration: "none",
            }}
          >
            Επιστροφή στην αρχική
          </a>
        </div>
      </body>
    </html>
  );
}
