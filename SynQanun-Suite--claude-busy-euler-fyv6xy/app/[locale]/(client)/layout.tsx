import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { TenantFooter } from '@/components/chrome';
import { firmName } from '@/fixtures/firm';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type NotificationRecord } from '@/lib/mock-api';
import {
  ClientTabBar,
  ClientPortalProvider,
  ClientPortalSidebar,
  type PortalEngagementOption,
} from './ClientPortalChrome';

/**
 * Shell for the client portal — the first screens behind a sign-in.
 *
 * WHY THE SIDEBAR LIVES HERE AND NOT ON THE PAGE
 * ---------------------------------------------------------------------------
 * App Router layouts do not remount when navigating between their children.
 * Putting the sidebar in a layout is therefore not just tidier than repeating
 * it on seven screens — it is what keeps the collapse state, the scroll
 * position and the focus ring intact as the client moves between Matters,
 * Invoices and Messages. A sidebar rendered per page would blink and reset on
 * every navigation.
 *
 * Same reasoning as the onboarding wizard's provider layout, applied to chrome
 * instead of state.
 *
 * WHAT THE PAGES STILL OWN
 * ---------------------------------------------------------------------------
 * The top bar stays with each page, because its title is per-screen. Hoisting
 * it would force the layout to reverse-engineer a title from the pathname — a
 * lookup table that would then have to be kept in step with seven routes.
 *
 * But a page renders <ClientTopBar>, not <TopBar> directly, and passes only its
 * title. Everything else the header shows — who is signed in, that the client
 * portal has no Digest — is bound once in ClientPortalChrome.tsx. That split
 * exists because the first two screens got it wrong: the dashboard passed the
 * signed-in name and the matters list did not, so the header identified the
 * user on one page and showed an em dash on the next.
 *
 * THE FOOTER IS NOT OPTIONAL
 * ---------------------------------------------------------------------------
 * <TenantFooter> carries <PoweredBy>, which brand-guidelines.md §7.2 requires in
 * "the main app footer… in every instance, permanently". This layout IS the
 * main app footer for the client side, which is the third real instance of that
 * footer row and the reason it is reused rather than rewritten. Its name is now
 * a little narrow — it is a tenant footer, not an auth footer — but renaming it
 * touches four working auth screens for no behavioural gain, so it is noted
 * here rather than churned.
 *
 * MOBILE
 * ---------------------------------------------------------------------------
 * design.md §8 replaces the sidebar with a bottom tab bar below 768px, and
 * <BottomTabBar> now does it. The 64px icon rail remains the 768–1279px
 * behaviour, which is what §8 actually specifies for that range — it had been
 * standing in for the phone case too.
 */
export default async function ClientPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // MOCK: both are fetched per navigation because a layout re-runs on every
  // route in its group. A real client would resolve the session once and
  // subscribe to the unread count rather than refetching it. Track A.5.
  const [account, { unreadCount }, engagements, notifications] = await Promise.all([
    mockApi.session.currentClient(),
    mockApi.messages.overview(),
    // Fetched here rather than per screen: the upload modal opens from four
    // different places and they must all offer the same list.
    mockApi.engagements.selectable(),
    // The bell is in the top bar, which is on every screen, so its badge cannot
    // be a per-page fetch the way the booking modal's availability is.
    mockApi.notifications.list(),
  ]);

  const typedLocale = locale as Locale;

  return (
    <ClientPortalShell
      locale={typedLocale}
      account={{
        name: account.name[typedLocale],
        meta: [account.title?.[typedLocale], account.organisation?.[typedLocale]]
          .filter(Boolean)
          .join(' · '),
        unreadCount,
      }}
      engagements={engagements.map((engagement) => ({
        reference: engagement.reference,
        kind: engagement.kind,
        title: engagement.title[typedLocale],
        lead: {
          name: engagement.lead.name[typedLocale],
          role: engagement.lead.role[typedLocale],
        },
      }))}
      notifications={notifications}
    >
      {children}
    </ClientPortalShell>
  );
}

function ClientPortalShell({
  locale,
  account,
  engagements,
  notifications,
  children,
}: {
  locale: Locale;
  account: { name: string; meta: string; unreadCount: number };
  engagements: PortalEngagementOption[];
  notifications: NotificationRecord[];
  children: React.ReactNode;
}) {
  const t = useTranslations('dashboard');

  return (
    // `h-screen` + `overflow-hidden` pins the sidebar while only the content
    // column scrolls — the Office-style frame design.md §1 asks for, rather
    // than a sidebar that scrolls away with the page.
    //
    // No `flex-row-reverse` and no left/right anywhere: the sidebar moves to
    // the end side in Arabic purely from `dir` on <html> (design.md §12).
    <ClientPortalProvider
      account={account}
      engagements={engagements}
      notifications={notifications}
    >
      <div className="flex h-screen overflow-hidden bg-canvas">
        <ClientPortalSidebar />

        {/* Bottom padding below 768px so the last row of a screen is not
            under the tab bar — see the staff layout's note. */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto max-tablet:pb-[calc(var(--syn-tab-bar-height)+env(safe-area-inset-bottom))]">
          {children}
          <TenantFooter firmName={firmName(locale)} copyright={t('copyright')} />
        </div>
      </div>

      {/* design.md §8: replaces the sidebar entirely below 768px. */}
      <ClientTabBar />
    </ClientPortalProvider>
  );
}
