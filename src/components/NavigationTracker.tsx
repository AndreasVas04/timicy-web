"use client";

/**
 * Invisible component that records whether the visitor has navigated
 * within the site during this session.
 *
 * Why this exists: document.referrer is NOT updated during Next.js App
 * Router client-side (soft) navigations. After the initial page load,
 * the referrer stays frozen on whatever page first linked the visitor
 * here, so a same-origin check on document.referrer always fails for
 * in-site navigations. sessionStorage is a reliable alternative because
 * it persists across client-side navigations within the same tab and
 * clears automatically when the tab closes.
 *
 * Rendered once in the root [locale] layout. It produces no DOM output.
 * The BackLink component reads the flag to decide between router.back()
 * and a category-page fallback.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";

/** SessionStorage key used by BackLink to detect in-site history. */
export const NAV_FLAG_KEY = "timicy:navigated";

export function NavigationTracker() {
  const pathname = usePathname();
  // Track the initial render so the flag is only set AFTER the first
  // navigation (not on the landing page itself).
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // First render: the visitor just landed on the site.
      // Do not set the flag yet — there is no in-site history to go back to.
      isFirstRender.current = false;
      return;
    }

    // Subsequent pathname change: the visitor navigated within the site.
    try {
      sessionStorage.setItem(NAV_FLAG_KEY, "1");
    } catch {
      // sessionStorage may throw in private/incognito modes or when
      // storage quota is exceeded. Silently ignore — BackLink will
      // fall back to the category page link.
    }
  }, [pathname]);

  // Renders nothing — purely a side-effect component.
  return null;
}
