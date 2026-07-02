/**
 * Next.js middleware for locale detection and routing.
 *
 * Redirects unprefixed paths to the default locale and negotiates the
 * preferred locale from the Accept-Language header on first visit.
 *
 * NOTE: In Next.js 15 this file is named middleware.ts.  If Next.js is
 * ever upgraded to 16+, this file must be renamed to proxy.ts.
 */
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except: api routes, the /og banner route, Next.js internals,
  // Vercel internals, and static files (anything with a dot in the last segment).
  matcher: ["/((?!api|og|_next|_vercel|.*\\..*).*)"],
};
