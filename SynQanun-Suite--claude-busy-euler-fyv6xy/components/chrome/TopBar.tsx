'use client';

import { Bell, Mail, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/navigation';
import { cn, initialsOf } from '@/lib/utils';
import { DigestTrigger } from './DigestTrigger';
import { LanguageToggle } from './LanguageToggle';

export interface TopBarProps {
  /**
   * Page title. design.md §3: one display-level title per screen, sentence
   * case, never all caps.
   */
  title: string;
  /** Optional line under the title — matter reference, client name, count. */
  subtitle?: string;
  /**
   * Show the Digest trigger. Optional because the Digest is a staff-side
   * feature: the client portal (design.md §11 item 6) has no access to it.
   */
  showDigest?: boolean;
  digestHasUpdate?: boolean;
  onOpenDigest?: () => void;
  onOpenSearch?: () => void;
  onOpenNotifications?: () => void;
  /** Unread notification count. */
  notificationCount?: number;
  /**
   * Where the envelope goes — the unified inbox. Absent, no envelope.
   *
   * Staff only. The client asked (October 2026) for the inbox to leave the
   * sidebar and live here, beside the bell, the way their mockup draws it: an
   * envelope with its own unread count. A link, not a button with a panel,
   * because the inbox is a whole screen rather than a list that fits a popover.
   */
  inboxHref?: string;
  /** Unread items in that inbox. */
  inboxCount?: number;
  /** Signed-in user's display name — initials are derived from it. */
  /**
   * A slot rendered before the account chip.
   *
   * Exists for the demo rank switcher, which is scaffolding rather than chrome
   * — see DemoViewerMenu.tsx. A slot rather than a `showViewerMenu` flag
   * because this component should not know what a demo control is, and because
   * the slot disappears with the scaffolding at Track A.5 rather than leaving a
   * dead prop behind.
   */
  leading?: React.ReactNode;
  userName?: string;
  /**
   * One line under the name — a job title, an organisation, a rank. Shown only
   * alongside `userName`, and only from tablet up, where there is room.
   *
   * Added when the Client Dashboard became the first screen behind a sign-in:
   * a portal that holds one client's privileged files should say plainly whose
   * session it is, so that a wrong account is noticed before a document is
   * opened rather than after.
   */
  userMeta?: string;
  className?: string;
}

/**
 * Application top bar: page title at the start, icon group at the end.
 *
 * BUILD_PLAN.md §3 requires "search/Digest/notifications/avatar as one
 * component" rather than reassembled per screen — the Stitch output's drifting
 * top bars are what this is correcting.
 *
 * RTL: nothing here is written in terms of left and right. The title sits at
 * the start and the icon group at the end via `justify-between`, so the whole
 * row mirrors in Arabic with no separate rule. Spacing uses `ms-`/`me-`.
 */
export function TopBar({
  title,
  subtitle,
  showDigest = true,
  digestHasUpdate = false,
  onOpenDigest,
  onOpenSearch,
  onOpenNotifications,
  notificationCount = 0,
  inboxHref,
  inboxCount = 0,
  leading,
  userName,
  userMeta,
  className,
}: TopBarProps) {
  const t = useTranslations('common');

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center justify-between gap-4',
        'border-b border-gray-200 bg-white ps-6 pe-4',
        // Tighter below 768px, where every pixel the chrome takes comes
        // straight out of the page title. See the note on the <h1>.
        'max-tablet:gap-2 max-tablet:ps-4 max-tablet:pe-2',
        className
      )}
    >
      {/* Start side — page title. Start-aligned, never centred (design.md §5). */}
      <div className="min-w-0">
        {/*
          Display scale: Cairo 800, 28px/36px — design.md §3. Steps down to the
          heading scale below 768px, because §3 sets the desktop scale and a
          page whose own name renders as "…" is not what it is protecting.

          KNOWN, AND NOT FULLY FIXED HERE. At 375px the icon group needs 177px
          of the 311px this header gets, so a long Arabic title — "ملفاتي
          القانونية" wants 149px at this size — still truncates. The 311px is
          the real culprit: the sidebar is still holding its 64px icon rail,
          because design.md §8's sub-768px bottom tab bar is not built. With the
          full 375px the title fits. Patching further here would mean pulling
          controls out of the header to paper over a missing layout, so it is
          left as it is and tracked with the tab bar.
        */}
        <h1 className="truncate font-display text-display text-gray-700 max-tablet:text-heading">
          {title}
        </h1>
        {/* The subtitle is supporting context. On a phone it only competes with
            the title for the same few pixels, so it stands down. */}
        {subtitle ? (
          <p className="truncate text-caption text-gray-500 max-tablet:hidden">{subtitle}</p>
        ) : null}
      </div>

      {/* End side — icon group. */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={t('search')}
          title={t('search')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Search aria-hidden size={18} />
        </button>

        {showDigest ? (
          <DigestTrigger onOpen={onOpenDigest} hasUpdate={digestHasUpdate} />
        ) : null}

        {inboxHref ? (
          <Link
            href={inboxHref}
            aria-label={inboxCount > 0 ? `${t('inbox')} (${inboxCount})` : t('inbox')}
            title={t('inbox')}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Mail aria-hidden size={18} />
            {inboxCount > 0 ? <CountBadge count={inboxCount} /> : null}
          </Link>
        ) : null}

        <button
          type="button"
          onClick={onOpenNotifications}
          // The client portal's notifications popover closes on any click
          // outside itself. Without this marker the bell would count as
          // "outside", so clicking it while open would close and immediately
          // reopen the panel. Inert for any other consumer of <TopBar>.
          data-notifications-trigger=""
          aria-label={
            notificationCount > 0 ? `${t('notifications')} (${notificationCount})` : t('notifications')
          }
          title={t('notifications')}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Bell aria-hidden size={18} />
          {notificationCount > 0 ? (
            // The human-action colour is correct here: this is the firm's own
            // work demanding attention, not anything the agent produced
            // (design.md §2).
            // Western digits in both languages — design.md §12.
            //
            // The `dir="ltr"` on the INNER element is load-bearing, and the bug
            // it fixes was invisible until the client portal wired a real
            // count: "9+" rendered as "+9" in Arabic. The overflow marker is a
            // digit followed by a neutral "+", and a run with no strong
            // character takes the paragraph's direction — so
            // `unicode-bidi: isolate` would NOT have helped, it would have
            // isolated the run and still laid it out right-to-left. This is the
            // case lib/format.ts calls "Latin whatever the locale": a fixed
            // token, not formatter output.
            //
            // It has to be the inner element. Putting `dir` on the positioned
            // span fixed the text and moved the badge to the wrong corner —
            // `inset-inline-end` resolves against the element's OWN direction,
            // so forcing LTR there flipped it back to the right in Arabic. The
            // box keeps the page's direction; only its contents are pinned.
            //
            // `action`, not `syn-red`: identical in accent mode, and in a themed
            // tenant the tenant's action colour, which is measured to hold white
            // at 4.5:1 (Meezan's bronze is 4.85:1). syn-red does not survive a
            // themed header any better than it survives a themed button.
            <CountBadge count={notificationCount} />
          ) : null}
        </button>

        {leading}

        {/* design.md §12: the language toggle is persistent in the top nav. */}
        <LanguageToggle />

        <span aria-hidden className="mx-1 h-6 w-px bg-gray-200" />

        <button
          type="button"
          aria-label={userName ? `${t('account')} — ${userName}` : t('account')}
          title={userName ?? t('account')}
          className="inline-flex items-center gap-2 rounded-sm p-1 hover:bg-gray-100"
        >
          {/* Initials rather than the feather: the feather is exclusively the
              AI's identity (brand-guidelines.md §5), so using it for a human
              user's avatar would break the human/AI distinction the whole
              colour system is built on. */}
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-caption font-medium text-gray-600">
            {userName ? initialsOf(userName) : '—'}
          </span>

          {userName ? (
            // `text-start` rather than text-left: this column reads right in
            // Arabic without a second rule.
            //
            // Shown from `desktop` (1280px), not `tablet`. At 820px the name
            // and its meta line took enough of a fixed-width icon group to
            // truncate the page title itself down to "Das…" — and between a
            // title and a name the user already knows, the title wins. Below
            // 1280 the avatar initials carry the identity on their own, and
            // the button's aria-label and title attribute still name the
            // account in full.
            <span className="hidden min-w-0 flex-col text-start desktop:flex">
              <span className="truncate text-caption font-medium text-gray-700">{userName}</span>
              {userMeta ? (
                <span className="truncate text-caption text-gray-500">{userMeta}</span>
              ) : null}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  );
}

export default TopBar;

/**
 * The unread count on the bell and the envelope. One component so the two
 * cannot drift; the reasoning for each class is in the note above the bell.
 */
function CountBadge({ count }: { count: number }) {
  return (
    <span
      className="absolute top-0 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-action px-1 text-caption font-medium text-white"
      style={{ insetInlineEnd: 0 }}
    >
      <span dir="ltr">{count > 9 ? '9+' : count}</span>
    </span>
  );
}
