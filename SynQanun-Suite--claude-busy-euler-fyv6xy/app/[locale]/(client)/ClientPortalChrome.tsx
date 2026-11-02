'use client';

import { demoFirm, isThemedTenant } from '@/fixtures/firm';
import { DemoViewerMenu } from '@/components/chrome/DemoViewerMenu';
import * as React from 'react';
import { useLocale } from 'next-intl';
import type { Locale } from '@/lib/i18n/routing';
import { BottomTabBar } from '@/components/chrome/BottomTabBar';
import { Sidebar, TopBar, type TopBarProps } from '@/components/chrome';
import { clientNavItems } from '@/components/chrome/nav-items';
import type { NotificationRecord } from '@/lib/mock-api';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsPanel } from './NotificationsPanel';

/**
 * The client portal's chrome, bound to its nav table and its signed-in account.
 *
 * WHY THIS FILE EXISTS AT ALL
 * ---------------------------------------------------------------------------
 * Two reasons, and they are different.
 *
 * The SIDEBAR needs a client boundary because `clientNavItems` carries a
 * `LucideIcon` per row — a React component, not data — and components do not
 * serialise across the server/client edge. Everything that crosses from the
 * server here is a plain string or number.
 *
 * The TOP BAR needs it because of a bug. <TopBar> takes the signed-in user's
 * name as a prop, the Client Dashboard passed it, and the Matters list — the
 * very next screen — did not. The result was a portal whose header said who you
 * were on one page and showed an em dash on the next. Identity is a property of
 * the SESSION, so it is fetched once in the layout and put in a context here;
 * a page supplies only its own title. There is no longer a prop a screen can
 * forget to pass.
 *
 * <TopBar> keeps its `userName`/`userMeta` props rather than reading a context
 * itself: it is shared chrome, and the staff side will resolve its account a
 * different way (a rank, not a client organisation). The binding belongs in the
 * route group, which is here.
 */

interface ClientAccount {
  name: string;
  /** Job title and organisation, already joined for display. */
  meta: string;
  unreadCount: number;
}

/**
 * One option in the engagement pickers, locale already resolved.
 *
 * Shared by the upload modal and the booking modal. `lead` is only read by the
 * latter — it names who a consultation would actually be with — but it belongs
 * on the engagement rather than beside it: the lead is a property OF the matter
 * or project, and the Stitch export's habit of restating one lawyer's name
 * across every option is what made the export's dropdown lie.
 */
export interface PortalEngagementOption {
  reference: string;
  kind: 'matter' | 'project';
  title: string;
  lead: { name: string; role: string };
}

interface ClientPortalValue extends ClientAccount {
  /** Open the global search overlay. Bound to the top bar and to Ctrl/Cmd+K. */
  openSearch: () => void;
  /** Toggle the notifications popover. Bound to the bell in the top bar. */
  toggleNotifications: () => void;
  /** Notifications not yet read in this session — the bell's badge. */
  unreadNotifications: number;
  /**
   * Engagements a client can file something against, or book a call about.
   *
   * Lives here for the same reason the signed-in name does: the upload modal
   * opens from the dashboard's quick actions, from the documents library, and
   * from either engagement detail, and threading the same list through four
   * unrelated screens is how one of them ends up with a stale or empty picker.
   * The layout fetches it once.
   */
  engagements: PortalEngagementOption[];
}

const ClientPortalContext = React.createContext<ClientPortalValue | null>(null);

export function ClientPortalProvider({
  account,
  engagements,
  notifications,
  children,
}: {
  account: ClientAccount;
  engagements: PortalEngagementOption[];
  notifications: NotificationRecord[];
  children: React.ReactNode;
}) {
  /*
   * The search overlay's open state lives here rather than on a page, for the
   * same reason the signed-in name does: it is a property of the portal, not of
   * whichever screen you happen to be on. The top bar is rendered per page and
   * only needs to call `openSearch`; the shortcut below has to work everywhere,
   * including on a screen with no top bar yet.
   */
  const [searchOpen, setSearchOpen] = React.useState(false);
  const openSearch = React.useCallback(() => setSearchOpen(true), []);
  const closeSearch = React.useCallback(() => setSearchOpen(false), []);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Ctrl+K on Windows and Linux, Cmd+K on a Mac — the convention users
      // already have from every other tool with a palette. Not bound to "/",
      // which would fire while typing into any of the portal's filter boxes.
      if (!event.key || event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setSearchOpen(true);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /*
   * Notification read state, for this session only.
   *
   * It lives here rather than inside the panel because the bell's badge and the
   * panel's list are the same count, and a panel that owns the state would mean
   * the badge could not see it. See NotificationsPanel.tsx for why read state is
   * allowed to work at all when a saved setting is not, and lib/mock-api.ts for
   * what the real per-user record carries.
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

  // `account` is a fresh object each render, so memoise on its fields rather
  // than on its identity. `engagements` is a fresh array per navigation too,
  // and keying on its length plus the first reference is enough: the list only
  // changes when an engagement opens or closes, which changes both.
  const value = React.useMemo(
    () => ({ ...account, engagements, openSearch, toggleNotifications, unreadNotifications }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      account.name,
      account.meta,
      account.unreadCount,
      engagements.length,
      engagements[0]?.reference,
      openSearch,
      toggleNotifications,
      unreadNotifications,
    ]
  );

  return (
    <ClientPortalContext.Provider value={value}>
      {children}
      {/* Both rendered once, here, so they survive navigation between portal
          screens and so no page has to remember to include them. */}
      <GlobalSearch open={searchOpen} onClose={closeSearch} />
      <NotificationsPanel
        open={notificationsOpen}
        onClose={closeNotifications}
        items={notifications}
        readIds={readIds}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </ClientPortalContext.Provider>
  );
}

function useClientPortal(): ClientPortalValue {
  const value = React.useContext(ClientPortalContext);
  if (!value) {
    throw new Error('Client portal chrome must be used inside <ClientPortalProvider>.');
  }
  return value;
}

/** Engagement options for the upload modal, from anywhere inside the portal. */
export function usePortalEngagements(): PortalEngagementOption[] {
  return useClientPortal().engagements;
}

/**
 * Persistent module sidebar for the client side.
 *
 * BUILD_PLAN.md §3 requires per-rank item visibility be "built as a prop, not
 * copy-pasted per screen". That still holds: <Sidebar> renders whatever list it
 * is handed, and this file decides what the client side's list is. When Batch 4
 * introduces the staff ranks, each gets its own equivalent of this file rather
 * than a branch inside <Sidebar>.
 */
export function ClientPortalSidebar() {
  const { unreadCount } = useClientPortal();

  const locale = useLocale() as Locale;
  const items = clientNavItems.map((item) =>
    item.id === 'messages' && unreadCount > 0 ? { ...item, count: unreadCount } : item
  );

  return <Sidebar items={items} tenantMark={tenantSidebarMark(locale)} themed={isThemedTenant()} />;
}

/**
 * The same list, below 768px — design.md §8.
 *
 * Built on this side rather than in the layout for the reason <StaffTabBar>
 * records: the nav's icons are components, and a component cannot cross the
 * server/client boundary as a prop. It also keeps the unread badge computed
 * once, here, for both pieces of chrome rather than in each of them.
 */
export function ClientTabBar() {
  const { unreadCount } = useClientPortal();

  const items = clientNavItems.map((item) =>
    item.id === 'messages' && unreadCount > 0 ? { ...item, count: unreadCount } : item
  );

  return <BottomTabBar items={items} />;
}

export type ClientTopBarProps = Pick<TopBarProps, 'title' | 'subtitle'>;

/**
 * Top bar for the client portal. A page passes its title; identity and the
 * Digest rule come from here.
 */
export function ClientTopBar({ title, subtitle }: ClientTopBarProps) {
  const { name, meta, openSearch, toggleNotifications, unreadNotifications } = useClientPortal();

  return (
    <TopBar
      title={title}
      subtitle={subtitle}
      // The magnifier in the header has been inert since the portal was built;
      // the overlay it should have opened is rendered by the provider above.
      /*
        The demo switcher, with an EMPTY rank list. The client portal has one
        account and one client organisation, so there is nothing to switch
        between on this side — the menu is here only so the jump back to the
        firm workspace exists. Without it the staff-to-client jump is one-way
        and a reviewer is stranded, which is the problem the switcher was built
        to solve in the first place.
      */
      leading={<DemoViewerMenu viewers={[]} currentId={null} side="client" />}
      onOpenSearch={openSearch}
      onOpenNotifications={toggleNotifications}
      // A real count, derived from the feed in the same render — see the
      // provider. This replaces the MOCK note that used to sit here saying a
      // number would be invented.
      notificationCount={unreadNotifications}
      // design.md §11 item 6 scopes the client portal to shared documents,
      // invoices and matter status. The Digest is a staff feature, so it is
      // switched off here once rather than on each of seven screens — the same
      // class of mistake as the missing name, pre-empted.
      showDigest={false}
      userName={name}
      userMeta={meta}
      className="sticky top-0 z-10"
    />
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
