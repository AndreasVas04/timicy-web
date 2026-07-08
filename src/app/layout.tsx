/**
 * Root layout — required by Next.js as the top-level layout for all routes.
 *
 * This project's real layout (header, footer, i18n provider) lives in
 * src/app/[locale]/layout.tsx. This root layout is minimal: it exists
 * solely to satisfy Next.js's requirement that a root layout wraps the
 * root not-found page (src/app/not-found.tsx), which handles 404s for
 * paths that fall outside the [locale] segment.
 *
 * Locale-prefixed routes pass through this layout transparently — the
 * [locale] layout provides the full HTML shell for normal pages.
 */

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
