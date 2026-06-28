/**
 * Locale-aware navigation primitives.
 *
 * These are thin wrappers around Next.js Link / useRouter / usePathname
 * that automatically handle the locale prefix in URLs.  Import these
 * instead of the plain next/link and next/navigation equivalents.
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
