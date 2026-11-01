'use client';

import * as React from 'react';
import { ChevronDown, FlaskConical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setDemoViewer } from '@/app/[locale]/(staff)/set-viewer-action';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The demo's rank switcher, and the one control in this product that admits to
 * being scaffolding.
 *
 * ===========================================================================
 * WHY IT EXISTS
 * ===========================================================================
 * Track A has no authentication, so which of the five ranks the workspace
 * renders as was a compile-time constant. That is workable locally, where you
 * edit `SIGNED_IN_STAFF_ID` and the dev server reloads, and useless on a
 * deployed build — reviewing five rank-specific dashboards meant five code
 * edits and five redeploys.
 *
 * ===========================================================================
 * IT IS DRESSED AS A TOOL, NOT AS A FEATURE
 * ===========================================================================
 * A polished account-switcher would be the wrong thing to build, because it
 * would look exactly like the real one this product does not have, and a
 * reviewer would reasonably conclude that identity works. So it carries a flask
 * rather than an avatar, says "demo control" in its own heading, and states in
 * the panel that there is no sign-in behind it.
 *
 * This is the same discipline as <AIDemoNotice>: where the prototype does
 * something the real product would do differently, the screen says so rather
 * than letting the reader assume.
 *
 * ===========================================================================
 * SWITCHING IS A REAL RANK CHANGE, NOT A COSTUME
 * ===========================================================================
 * Worth being precise, because it is the reason the control is useful. The
 * cookie feeds `currentStaff()`, and every gate in the product reads its
 * result — `staffRouteAllows`, the four permissions.ts modules, `recordsTime`.
 * So switching to a paralegal does not merely hide the Billing entry: opening
 * /staff/billing by hand genuinely refuses. What a reviewer sees is what that
 * rank sees, refusals included.
 *
 * MOCK: deleted at Track A.5 with lib/demo-viewer.ts. Seeing the product as
 * another rank then means signing in as somebody who holds that rank.
 */

export interface DemoViewerOption {
  id: string;
  /** Already resolved for the locale by the server. */
  name: string;
  /** Already translated. */
  rankLabel: string;
}

export function DemoViewerMenu({
  viewers,
  currentId,
  /** Which workspace the reader is in — decides which jump is offered. */
  side,
}: {
  viewers: DemoViewerOption[];
  currentId: string | null;
  side: 'staff' | 'client';
}) {
  const t = useTranslations('demoViewer');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const wrap = React.useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape. A menu that traps the reader is worse
  // than no menu, and this one sits over every screen in the product.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (id: string) => {
    startTransition(async () => {
      const result = await setDemoViewer(id);
      if (!result.ok) return;
      setOpen(false);
      // Always land on the staff workspace: a rank only means something there,
      // and switching from inside the client portal would otherwise change
      // nothing the reader can see.
      router.push('/staff');
      router.refresh();
    });
  };

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'inline-flex items-center gap-1.5 rounded-btn border border-dashed px-2 py-1.5',
          'border-gray-300 text-caption text-gray-600 hover:bg-gray-50',
          open && 'bg-gray-50'
        )}
      >
        {/* Deliberately not the feather and not an avatar. The feather is the
            AI's mark (brand-guidelines.md §5) and an avatar would read as an
            account. A flask reads as what this is. */}
        <FlaskConical aria-hidden size={14} className="shrink-0 text-gray-500" />
        <span className="hidden tablet:inline">{t('trigger')}</span>
        <ChevronDown aria-hidden size={13} className="shrink-0 text-gray-500" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t('heading')}
          /*
            `end-0` is logical, so the panel hangs from the reader's end edge
            and mirrors without a second rule.

            BELOW 768px IT STOPS HANGING FROM THE TRIGGER ALTOGETHER. Anchored,
            a 272px panel on a 375px screen ran six pixels past the edge in
            Arabic — the trigger sits 109px in, and no width cap fixes that
            because the overflow comes from the anchor point, not the width. So
            on a phone it is pinned across the viewport with a gutter each side
            instead, which is direction-agnostic by construction.
          */
          className={cn(
            'absolute top-full z-50 mt-1 w-[17rem] end-0',
            'max-tablet:fixed max-tablet:top-[calc(var(--syn-topbar-height)+0.25rem)]',
            'max-tablet:mt-0 max-tablet:w-auto max-tablet:[inset-inline:0.75rem]',
            'rounded-card border border-gray-200 bg-white p-3 shadow-lg'
          )}
        >
          <p className="text-caption font-medium text-gray-700">{t('heading')}</p>
          {/* The client portal passes no viewers: it has one account and one
              client organisation, so it gets the jump and nothing else. */}
          <p className="mt-1 text-caption text-gray-500">
            {viewers.length > 0 ? t('body') : t('bodyClient')}
          </p>

          {viewers.length === 0 ? null : (
          <ul className="mt-3 flex flex-col gap-0.5">
            {viewers.map((viewer) => {
              const active = viewer.id === currentId;
              return (
                <li key={viewer.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => choose(viewer.id)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex w-full flex-col rounded-sm px-2 py-1.5 text-start',
                      active ? 'bg-gray-100' : 'hover:bg-gray-50',
                      pending && 'opacity-60'
                    )}
                  >
                    {/* The rank leads, because the rank is what is being
                        chosen; the person is how the fixtures express it. */}
                    <span className="text-caption font-medium text-gray-700">
                      {viewer.rankLabel}
                    </span>
                    <span className="text-caption text-gray-500">
                      <bdi>{viewer.name}</bdi>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          )}

          <div className="mt-3 border-t border-gray-200 pt-3">
            {/*
              No onClick closing the menu. Setting state here re-renders and
              unmounts this anchor before the browser follows it, so the first
              build of this swallowed its own navigation and the jump did
              nothing. The link crosses route groups, which remounts the chrome
              and takes the menu with it.
            */}
            <Link
              href={side === 'staff' ? '/dashboard' : '/staff'}
              className="block rounded-sm px-2 py-1.5 text-caption text-legal-navy hover:bg-gray-50"
            >
              {side === 'staff' ? t('toClient') : t('toStaff')}
            </Link>
            {/* Said where the jump is offered, because the client portal is a
                different party's view rather than another page of this one. */}
            <p className="mt-1 px-2 text-caption text-gray-500">
              {side === 'staff' ? t('toClientNote') : t('toStaffNote')}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DemoViewerMenu;
