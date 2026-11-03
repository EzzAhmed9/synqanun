import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, getAuthToken } from '@/lib/auth-token';
import { demoStaff } from '@/fixtures/practice';
import { switchableViewers } from '@/lib/demo-viewer';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { TenantFooter } from '@/components/chrome';
import { MueenLauncher } from '@/components/mueen';
import { firmName } from '@/fixtures/firm';
import type { Locale } from '@/lib/i18n/routing';
import { backendBridge } from '@/lib/backend-bridge';
import { mockApi, type StaffNotificationRecord } from '@/lib/mock-api';
import { recordsTime, type Rank } from '@/lib/ranks';
import { StaffProvider, StaffSidebar, StaffTabBar, StaffTimer } from './StaffChrome';

/**
 * Shell for the staff workspace — the firm's own side of the product.
 *
 * Mirrors the client portal's layout deliberately: the sidebar lives here so it
 * does not remount between screens, each page supplies only its own top-bar
 * title, and the footer carries <PoweredBy> as brand-guidelines.md §7.2
 * requires "in every instance, permanently".
 *
 * THE TIMER IS MOUNTED HERE, AND NOT FOR EVERYONE
 * ---------------------------------------------------------------------------
 * A billable-hours timer that stopped when you opened a different matter would
 * be useless. Putting it in the layout is what makes it survive navigation
 * across the whole staff side — and keeping it out of (client) is what stops it
 * appearing on a screen where recording time makes no sense.
 *
 * It is also gated by rank. A legal secretary's time is not charged to a
 * client, so a billable-hours timer on that workspace is an instrument with
 * nothing to measure — see `RANKS_THAT_BILL` in lib/ranks.ts. Absent, never
 * disabled, on the same reasoning as the nav's Billing and Approvals entries.
 *
 * WHAT THIS LAYOUT DOES NOT FETCH
 * ---------------------------------------------------------------------------
 * The client layout pulls four things per navigation because its chrome needs
 * them — the unread badge, the engagement picker, the notification feed. This
 * one fetches only the signed-in person, because the staff chrome's badges are
 * not built yet. A layout fetch is paid on every route in its group, so it
 * stays empty until something in the chrome actually needs it.
 *
 * MOBILE
 * ---------------------------------------------------------------------------
 * design.md §8's three breakpoints are all covered now. Above 1280px the full
 * sidebar; 768–1279px the 64px icon rail; below 768px the sidebar is REPLACED
 * by <BottomTabBar>, which is what §8 asks for and what the icon rail had been
 * standing in for on phones. See components/chrome/BottomTabBar.tsx for the
 * three decisions that held it up, including the timer collision.
 */
export default async function StaffLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const token = await getAuthToken();
  if (!token) {
    redirect(`/${locale}/gateway/firm`);
  }

  const me = await backendBridge.auth.me();
  if (!me || me.side !== 'staff') {
    try {
      const jar = await cookies();
      jar.delete(AUTH_COOKIE_NAME);
    } catch {
      // ignore
    }
    redirect(`/${locale}/gateway/firm`);
  }

  const personName = locale === 'ar' ? (me.name_ar || me.name_en) : (me.name_en || me.name_ar);
  const personRank = (me.rank as Rank) || 'partner';
  const personId = me.id;

  const [notifications, inbox] = await Promise.all([
    mockApi.staff.notifications(personId),
    mockApi.staff.inbox(personId),
  ]);

  const viewers = switchableViewers().map(({ id, rank }) => ({
    id,
    rank,
    name: demoStaff.find((member) => member.id === id)?.name[locale as Locale] ?? '—',
  }));

  return (
    <StaffShell
      locale={locale as Locale}
      name={personName}
      rank={personRank}
      viewers={viewers}
      viewerId={personId}
      notifications={notifications}
      inboxUnread={inbox.unreadCount}
    >
      {children}
    </StaffShell>
  );
}

function StaffShell({
  locale,
  name,
  rank,
  viewers,
  viewerId,
  notifications,
  inboxUnread,
  children,
}: {
  locale: Locale;
  name: string;
  rank: Rank;
  viewers: { id: string; rank: Rank; name: string }[];
  viewerId: string;
  notifications: StaffNotificationRecord[];
  inboxUnread: number;
  children: React.ReactNode;
}) {
  const t = useTranslations('staff');
  const tRanks = useTranslations('ranks');

  return (
    // `holder`, not the bare rank: this sits under a person's name. See
    // lib/ranks.ts.
    <StaffProvider
      account={{
        name,
        meta: tRanks(`holder.${rank}`),
        rank,
        viewerId,
        // Rank labels translated here, where the dictionary is.
        viewers: viewers.map((v) => ({ id: v.id, name: v.name, rankLabel: tRanks(v.rank) })),
        inboxUnread,
      }}
      notifications={notifications}
    >
      {/* Same frame as the client portal: the sidebar is pinned and only the
          content column scrolls. No left/right anywhere — the sidebar moves to
          the end side in Arabic from `dir` on <html> alone (design.md §12). */}
      <div className="flex h-screen overflow-hidden bg-canvas">
        <StaffSidebar />

        {/*
          The bottom padding below 768px is what stops the last row of every
          screen sitting under the tab bar. It is on the SCROLLING column, not
          on the bar, because the bar is fixed and takes no space in flow.
        */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto max-tablet:pb-[calc(var(--syn-tab-bar-height)+env(safe-area-inset-bottom))]">
          {children}
          <TenantFooter firmName={firmName(locale)} copyright={t('copyright')} />
        </div>
      </div>

      {/* Gated, not disabled. See RANKS_THAT_BILL. */}
      {recordsTime(rank) ? <StaffTimer /> : null}

      {/* design.md §8: replaces the sidebar entirely below 768px. Chrome, so
          it is mounted once here and every staff route inherits it. */}
      <StaffTabBar />

      {/*
        The assistant's floating launcher and panel — design.md §6 reserved
        elevation level 2 for "the floating AI chat panel" long before there
        was one. Mounted here for the same reason the timer is: it belongs to
        every staff screen and to none of the client portal's (design.md §11
        item 6 keeps the assistant off the client side entirely).

        Ungated by rank, unlike the timer. The assistant answers from what the
        reader can already see — the Digest's own calls are scoped to them —
        so there is no rank for which a face in the corner is an instrument
        with nothing to measure.
      */}
      <MueenLauncher />
    </StaffProvider>
  );
}
