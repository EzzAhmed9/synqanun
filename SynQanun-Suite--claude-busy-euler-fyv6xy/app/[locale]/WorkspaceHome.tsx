'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { clientNavItems, resolveActiveNavId } from '@/components/chrome/nav-items';
import { Link, usePathname } from '@/lib/i18n/navigation';

/**
 * The way out of the error page and the 404 — to the workspace you were in.
 *
 * ===========================================================================
 * BOTH PAGES USED TO SEND EVERYONE INTO THE CLIENT PORTAL
 * ===========================================================================
 * `error.tsx` and `not-found.tsx` each linked to `/dashboard`, which is
 * `app/[locale]/(client)/dashboard` — the CLIENT's home. So a partner whose
 * billing screen threw, or who followed a stale link into the staff 404, was
 * offered one button and it led out of the firm's workspace and into a client's.
 *
 * It was the only link on either page, so there was no second option to notice
 * it by. Found while auditing the staff side's empty and error states; the
 * transcript reader's own 404 gate, shipped in this same batch, was handing
 * that button to a partner within a day of being written.
 *
 * ===========================================================================
 * THE PATH IS THE ONLY EVIDENCE, AND THE DEFAULT IS THE LEAST PRIVILEGED ONE
 * ===========================================================================
 * There is no session to ask (Track A has no authentication), so the address
 * the reader is on is all there is to go on. Two allow-lists, and anything that
 * matches neither falls to the landing page rather than to somebody's portal:
 *
 *   · Anything under /staff is the firm's workspace. The whole staff side is
 *     namespaced under that one segment — see app/[locale]/(staff)/staff — so
 *     the prefix is unambiguous, including for routes with no nav entry.
 *
 *   · The client portal is recognised by ITS OWN ROUTE TABLE, through the same
 *     `resolveActiveNavId` the sidebar and the bottom tab bar use. A separate
 *     list of portal sections here would be a third copy free to fall behind
 *     the other two the next time one is added.
 *
 *   · Everything else — the landing page, the gateways, onboarding, password
 *     resets, and any address that names nothing at all — goes to `/`. Sending
 *     a firm administrator halfway through onboarding into a client's portal is
 *     the same mistake in a different costume, and a stranger who mistyped a
 *     URL is not a client. If a portal section is ever added without being
 *     added to the nav, this falls to the landing page: a harmless wrong link
 *     rather than a door into privileged files.
 */
export function WorkspaceHome() {
  const t = useTranslations('errors');
  const pathname = usePathname();

  // next-intl's usePathname returns the path WITHOUT the locale prefix, which
  // is what both nav tables are written in.
  const staff = pathname === '/staff' || pathname.startsWith('/staff/');
  const portal = resolveActiveNavId(clientNavItems, pathname) !== undefined;

  const { href, label } = staff
    ? { href: '/staff', label: t('backToStaff') }
    : portal
      ? { href: '/dashboard', label: t('backToDashboard') }
      : { href: '/', label: t('backToStart') };

  return (
    <Link href={href}>
      <Button variant="secondary">{label}</Button>
    </Link>
  );
}

export default WorkspaceHome;
