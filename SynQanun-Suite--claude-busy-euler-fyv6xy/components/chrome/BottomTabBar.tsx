'use client';

import * as React from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import { resolveActiveNavId, type NavItem } from './nav-items';

/**
 * The sub-768px bottom tab bar — design.md §8, "Bottom tab bar replaces
 * sidebar entirely".
 *
 * ===========================================================================
 * WHY THIS WAS DEFERRED THREE TIMES, AND WHAT THE DECISIONS ARE
 * ===========================================================================
 * There was never an architectural blocker. Three things were genuinely
 * undecided, and each one is a judgement rather than a line of code, which is
 * how a task ends up "tracked, not done" three batches running.
 *
 * 1. THIRTEEN ITEMS DO NOT FIT A TAB BAR. The staff nav has thirteen entries
 *    before rank filtering; a phone fits four or five. §8 says the tab bar
 *    REPLACES the sidebar, so every entry still has to be reachable.
 *
 *    Decided: the first four of the already-rank-filtered nav become tabs, in
 *    the order the sidebar uses, and a fifth "More" tab opens a sheet holding
 *    the rest. The sidebar's order is already a considered priority order —
 *    inventing a second, mobile-only ranking would be a second opinion about
 *    what matters, free to drift from the first.
 *
 *    The client portal has seven entries, so it splits the same way rather
 *    than getting a special case at six-or-fewer.
 *
 * 2. THE TIMER PILL SITS EXACTLY HERE. `fixed bottom-6` — the one real
 *    collision in the whole job, and the reason this is not purely additive.
 *    Fixed in TimerPill.tsx: below 768px it rides above the bar rather than
 *    underneath it.
 *
 * 3. THE HOME INDICATOR. A bar flush to the bottom of an iOS viewport puts its
 *    touch targets under the system gesture area. Handled with
 *    `env(safe-area-inset-bottom)` padding, which is zero everywhere that has
 *    no inset.
 *
 * ===========================================================================
 * IT IS CHROME, NOT A SCREEN
 * ===========================================================================
 * Mounted once in each group's layout beside the sidebar it replaces, so every
 * route in both halves of the product inherits it without knowing it exists —
 * the same arrangement the sidebar and top bar already have.
 *
 * ===========================================================================
 * NO `left`/`right` ANYWHERE
 * ===========================================================================
 * `inset-inline` and logical padding only. The bar spans the viewport, so the
 * mirroring that matters is the ORDER of the tabs, which follows `dir` on
 * <html> for free — first tab at the start edge in both directions
 * (design.md §12).
 */

/** How many items become tabs before the rest go under "More". */
const PRIMARY_TABS = 4;

export interface BottomTabBarProps {
  /** The same rank-filtered list the sidebar is given. */
  items: NavItem[];
}

export function BottomTabBar({ items }: BottomTabBarProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // The same rule the sidebar uses, from the same function — see nav-items.ts.
  const activeId = resolveActiveNavId(items, pathname);

  const overflow = items.length > PRIMARY_TABS;
  const primary = overflow ? items.slice(0, PRIMARY_TABS) : items;
  const rest = overflow ? items.slice(PRIMARY_TABS) : [];

  /*
    "More" reads as current when the screen you are on lives inside it.
    Without this, opening Settings on a phone leaves every tab unlit and the
    bar stops answering "where am I" — which is the only question a tab bar
    exists to answer.
  */
  const activeIsInRest = rest.some((item) => item.id === activeId);

  // Route changes close the sheet. Otherwise tapping an entry navigates behind
  // a panel that stays open over the screen it just asked for.
  React.useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  return (
    <>
      {/* The sheet, above the bar and below nothing else. ---------------- */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-40 tablet:hidden">
          {/*
            A real button, not a div with an onClick: dismissing an overlay is
            an action, and this is the one every touch user reaches for first.
          */}
          <button
            type="button"
            aria-label={t('closeMore')}
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-gray-900/40"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('more')}
            className="absolute bottom-0 [inset-inline:0] max-h-[70vh] overflow-y-auto rounded-t-card border-t border-gray-200 bg-white pb-[calc(var(--syn-tab-bar-height)+env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-body font-medium text-gray-700">{t('more')}</h2>
              <button
                type="button"
                aria-label={t('closeMore')}
                onClick={() => setSheetOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100"
              >
                <X aria-hidden size={18} />
              </button>
            </div>

            <ul className="flex flex-col py-1">
              {rest.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === activeId;

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        // 44px minimum — design.md §8.
                        'flex min-h-11 items-center gap-3 px-4 py-2.5 text-body',
                        isActive ? 'bg-gray-100 text-action-pressed' : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <Icon aria-hidden size={18} className="shrink-0" />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      {/* The bar itself. -------------------------------------------------- */}
      <nav
        aria-label={t('modules')}
        className={cn(
          // `[inset-inline:0]` rather than left-0 right-0 — design.md §12. There is
          // no inset-inline scale in this Tailwind build, hence the arbitrary.
          'fixed bottom-0 z-50 [inset-inline:0] border-t border-gray-200 bg-white',
          // Off above 768px, where the sidebar takes over. The two are never
          // on screen together.
          'tablet:hidden',
          // The home indicator. Zero on anything without an inset.
          'pb-[env(safe-area-inset-bottom)]'
        )}
      >
        <ul className="flex items-stretch">
          {primary.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;

            return (
              <li key={item.id} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    // h-14 is 56px — comfortably past §8's 44px minimum once
                    // the label is under the icon.
                    'flex h-14 flex-col items-center justify-center gap-0.5 px-1',
                    isActive ? 'text-action' : 'text-gray-500'
                  )}
                >
                  <Icon aria-hidden size={20} className="shrink-0" />
                  {/*
                    The label is truncated rather than wrapped: two lines would
                    make one tab taller than its neighbours and the bar would
                    stop being a row. `nav.*` labels are short in both scripts.
                  */}
                  <span className="w-full truncate text-center text-[11px] leading-tight">
                    {t(item.labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}

          {overflow ? (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setSheetOpen((open) => !open)}
                aria-expanded={sheetOpen}
                // Current when the screen you are on is inside the sheet.
                aria-current={activeIsInRest ? 'page' : undefined}
                className={cn(
                  'flex h-14 w-full flex-col items-center justify-center gap-0.5 px-1',
                  activeIsInRest || sheetOpen ? 'text-action' : 'text-gray-500'
                )}
              >
                <MoreHorizontal aria-hidden size={20} className="shrink-0" />
                <span className="w-full truncate text-center text-[11px] leading-tight">
                  {t('more')}
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
    </>
  );
}

export default BottomTabBar;
