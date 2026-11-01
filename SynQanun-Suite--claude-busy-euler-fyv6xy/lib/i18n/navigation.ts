import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware navigation primitives.
 *
 * Always import Link/useRouter/usePathname from here rather than from
 * `next/link` or `next/navigation` — these variants carry the active locale
 * through every navigation, which is what keeps the language toggle from being
 * reset on each page change.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
