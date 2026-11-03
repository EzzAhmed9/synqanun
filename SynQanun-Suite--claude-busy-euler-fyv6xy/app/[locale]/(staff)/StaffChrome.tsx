'use client';

import { demoFirm, isThemedTenant } from '@/fixtures/firm';
import type { DemoViewerOption } from '@/components/chrome/DemoViewerMenu';
import * as React from 'react';
import { useLocale } from 'next-intl';
import type { Locale } from '@/lib/i18n/routing';
import { BottomTabBar } from '@/components/chrome/BottomTabBar';
import { Sidebar, TimerPill, TopBar, type TopBarProps } from '@/components/chrome';
import { TimerLogModal } from '@/components/chrome/TimerLogModal';
import { launcherAppliesTo } from '@/components/mueen/launcher-visibility';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { staffNavFor } from '@/components/chrome/nav-items';
import type { StaffNotificationRecord } from '@/lib/mock-api';
import type { Rank } from '@/lib/ranks';
import { StaffNotificationsPanel } from './StaffNotificationsPanel';
import { StaffSearch } from './StaffSearch';

/**
 * The staff workspace's chrome, bound to the signed-in fee earner and rank.
 *
 * The client portal's equivalent is ClientPortalChrome.tsx, and this file is
 * deliberately its sibling rather than a generalisation of it. They diverge in
 * three ways that would make a shared component a pile of flags:
 *
 *   · THE NAV IS RANK-FILTERED. `staffNavFor(rank)` decides what this person
 *     sees; the client side has one fixed list.
 *   · THE DIGEST IS ON. design.md §11 item 6 keeps it off the client portal
 *     entirely, which is why <ClientTopBar> hardcodes `showDigest={false}`.
 *   · THE TIMER EXISTS. Recording billable time is a fee earner's action and
 *     makes no sense on a client's screen, so <TimerPill> is mounted here and
 *     nowhere in (client).
 *
 * What they share is <Sidebar>, <TopBar> and <TimerPill> themselves — the kit
 * components take props and know nothing about which side of the product they
 * are on, which is the arrangement BUILD_PLAN.md §3 asks for.
 */

interface StaffAccount {
  name: string;
  /** Rank label, already translated. */
  meta: string;
  rank: Rank;
  /** Demo scaffolding — see components/chrome/DemoViewerMenu.tsx. */
  viewers: DemoViewerOption[];
  viewerId: string;
  /** Unread items in the unified inbox — the top bar envelope's badge. */
  inboxUnread: number;
}

interface StaffValue extends StaffAccount {
  /** Open the firm-wide search overlay. Bound to the top bar and to Ctrl/Cmd+K. */
  openSearch: () => void;
  openDigest: () => void;
  /** Toggle the notifications panel. Bound to the bell in the top bar. */
  toggleNotifications: () => void;
  /** Notifications not yet read in this session — the bell's badge. */
  unreadNotifications: number;
}

const StaffContext = React.createContext<StaffValue | null>(null);

export function StaffProvider({
  account,
  notifications,
  children,
}: {
  account: StaffAccount;
  notifications: StaffNotificationRecord[];
  children: React.ReactNode;
}) {
  const router = useRouter();

  /*
   * Notification read state, for this session only — see the client portal's
   * provider and NotificationsPanel.tsx for what a read flag may assert. It
   * lives here so the bell's badge and the panel's list are one count.
   */
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [readIds, setReadIds] = React.useState<ReadonlySet<string>>(() => new Set());
  const toggleNotifications = React.useCallback(() => setNotificationsOpen((open) => !open), []);
  const closeNotifications = React.useCallback(() => setNotificationsOpen(false), []);
  const markRead = React.useCallback(
    (id: string) => setReadIds((current) => new Set(current).add(id)),
    []
  );
  const markAllRead = React.useCallback(
    () => setReadIds(new Set(notifications.map((item) => item.id))),
    [notifications]
  );
  const unreadNotifications = notifications.filter((item) => !readIds.has(item.id)).length;

  /*
   * The firm's search. It was a named no-op until it had its own overlay,
   * because the client portal's would have searched the wrong scope; see
   * StaffSearch.tsx. Opening it closes the notifications panel, so two
   * keyboard traps are never live at once.
   */
  const [searchOpen, setSearchOpen] = React.useState(false);
  const openSearch = React.useCallback(() => {
    setNotificationsOpen(false);
    setSearchOpen(true);
  }, []);
  const closeSearch = React.useCallback(() => setSearchOpen(false), []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Ctrl+K / Cmd+K, the same shortcut as the client portal.
      if (!event.key || event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      openSearch();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

  /*
   * The Digest button now goes somewhere. Batch 5 built the conversation, and
   * this header is the entrance every staff screen already carries — so the
   * one control that has been inert since Batch 4 stops being a button that
   * does nothing. `useRouter` here is the locale-aware one from lib/i18n, so
   * an Arabic reader lands on /ar/staff/ai/digest rather than being dropped
   * into English.
   */
  const openDigest = React.useCallback(() => {
    router.push('/staff/ai/digest');
  }, [router]);

  const value = React.useMemo(
    () => ({ ...account, openSearch, openDigest, toggleNotifications, unreadNotifications }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      account.name,
      account.meta,
      account.rank,
      account.viewerId,
      account.viewers,
      account.inboxUnread,
      openSearch,
      openDigest,
      toggleNotifications,
      unreadNotifications,
    ]
  );

  return (
    <StaffContext.Provider value={value}>
      {children}
      {/* Rendered once, here, so they survive navigation between staff screens. */}
      <StaffSearch open={searchOpen} onClose={closeSearch} />
      <StaffNotificationsPanel
        open={notificationsOpen}
        onClose={closeNotifications}
        items={notifications}
        readIds={readIds}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </StaffContext.Provider>
  );
}

function useStaff(): StaffValue {
  const value = React.useContext(StaffContext);
  if (!value) throw new Error('Staff chrome must be used inside <StaffProvider>.');
  return value;
}

/** The rank-filtered sidebar. See `staffNavFor`. */
export function StaffSidebar() {
  const { rank } = useStaff();
  const locale = useLocale() as Locale;
  return (
    <Sidebar
      items={staffNavFor(rank)}
      tenantMark={tenantSidebarMark(locale)}
      themed={isThemedTenant()}
    />
  );
}

/**
 * The same list, below 768px — design.md §8.
 *
 * A THIN WRAPPER FOR THE SAME REASON <StaffSidebar> IS ONE, and the reason is
 * worth recording because it cost a render: every nav entry carries a lucide
 * icon, an icon is a COMPONENT, and a component is a function. Handing the
 * built list from the server layout straight to a client component fails with
 * "Functions cannot be passed directly to Client Components" — thirteen times,
 * once per icon.
 *
 * So the RANK crosses the boundary and the list is built on this side, exactly
 * as the sidebar has always done it.
 */
export function StaffTabBar() {
  const { rank } = useStaff();
  return <BottomTabBar items={staffNavFor(rank)} />;
}

export type StaffTopBarProps = Pick<TopBarProps, 'title' | 'subtitle'>;

/**
 * Top bar for the staff workspace. A page passes its title; identity, the
 * Digest and the rank come from here — the same split that fixed the client
 * portal's missing-name bug.
 */
export function StaffTopBar({ title, subtitle }: StaffTopBarProps) {
  const {
    name,
    meta,
    openSearch,
    openDigest,
    toggleNotifications,
    unreadNotifications,
    viewers,
    viewerId,
    inboxUnread,
  } = useStaff();

  return (
    <TopBar
      title={title}
      subtitle={subtitle}
      // The Digest is a staff feature. This is the first screen in the product
      // where it is switched on.
      showDigest
      onOpenDigest={openDigest}
      onOpenSearch={openSearch}
      onOpenNotifications={toggleNotifications}
      // The staff feed — approvals, filings, team activity — derived in
      // mockApi.staff.notifications, not the client's.
      notificationCount={unreadNotifications}
      // The unified inbox, which left the sidebar for here (October 2026).
      inboxHref="/staff/inbox"
      inboxCount={inboxUnread}
      userName={name}
      userMeta={meta}
      className="sticky top-0 z-10"
    />
  );
}

/**
 * The billable-hours timer.
 *
 * Mounted once in the staff layout so it survives navigation between staff
 * screens — the whole point of a running timer is that moving between a matter
 * and the calendar does not stop it.
 *
 * MOCK: stopping it discards the elapsed seconds (see UIStateProvider). It does
 * NOT write a time entry, and the dashboard's recorded-hours figure is not fed
 * by it — the billing card says so rather than letting a partner assume the two
 * are connected. The export instead ships a timer pre-loaded with 01:35:14
 * against MAT-2201, which is time nobody worked.
 */
export function StaffTimer() {
  const pathname = usePathname();
  const match = pathname.match(/\/(?:register|matters)\/([A-Z0-9-]+)/);
  const currentMatter = match ? match[1] : undefined;

  return (
    <>
      <TimerPill matterRef={currentMatter} stacked={launcherAppliesTo(pathname)} />
      <TimerLogModal />
    </>
  );
}

/**
 * The tenant's marks for the sidebar, or null in accent mode.
 *
 * Resolved here rather than inside <Sidebar> so the chrome component keeps
 * knowing nothing about tenant configuration — see its props.
 *
 * The GOLD-ON-DARK lockup, because the themed rail is charcoal: the
 * full-colour mark's charcoal strokes disappear on it. Choosing the variant is
 * the job of whoever knows what surface it lands on, which is this file.
 */
function tenantSidebarMark(locale: Locale) {
  if (!isThemedTenant()) return null;
  return {
    lockup: '/brand/meezan/meezan-logo-gold-on-dark.svg',
    mark: '/brand/meezan/meezan-mark-gold.svg',
    // The firm's name in the reader's language: an Arabic screen reader
    // should not announce the logo in English.
    alt: demoFirm.name[locale],
  };
}
