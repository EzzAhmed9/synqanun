import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi } from '@/lib/mock-api';
import { DashboardNotBuilt } from './DashboardNotBuilt';
import { JuniorAssociateDashboard } from './JuniorAssociateDashboard';
import { LegalSecretaryDashboard } from './LegalSecretaryDashboard';
import { ParalegalDashboard } from './ParalegalDashboard';
import { PartnerDashboard } from './PartnerDashboard';
import { SeniorAssociateDashboard } from './SeniorAssociateDashboard';
import { hasDashboard } from './rank-dashboards';

/**
 * /staff — one route, one dashboard per rank.
 *
 * ===========================================================================
 * WHY THE GATE IS HERE AND NOT AROUND THE MARKUP
 * ===========================================================================
 * `staffNavFor()` in components/chrome/nav-items.ts gates the SIDEBAR. It
 * cannot stop a route from rendering privileged contents, and this route used
 * to: whoever was signed in got the Partner Dashboard, so a paralegal saw a
 * correctly narrowed nav — no Billing, no Approvals — wrapped around the
 * partner's approval queue, the firm's recorded hours and the client list.
 *
 * So the rank is resolved FIRST and each branch reads only what its own screen
 * shows. A senior associate's request never touches `clients()` or
 * `practiceCounts()`; gating the JSX instead would have fetched everything and
 * serialised it into the RSC payload, where it is readable with view-source.
 * Hidden UI is not withheld data.
 *
 * See rank-dashboards.ts for why the list of built dashboards is an allow-list,
 * and why "not built" is deliberately not presented as "not allowed".
 *
 * ===========================================================================
 * WHAT DIFFERS BETWEEN THE FIVE, IN ONE PARAGRAPH
 * ===========================================================================
 * A PARTNER sees the firm as a book: every client, how the whole practice is
 * distributed, and the approvals only they can sign. Everyone below sees the
 * files they are personally on. A SENIOR ASSOCIATE reviews what comes up from
 * below and tracks what they sent above — the only rank with both. A JUNIOR
 * ASSOCIATE has submissions and tasks but no queue of other people's work. A
 * PARALEGAL has tasks and the engagements they support, and raises work rather
 * than reviewing it. A LEGAL SECRETARY is the one screen organised around
 * PEOPLE rather than files, and the one rank that records no billable time.
 *
 * ===========================================================================
 * EVERY NUMBER IS COUNTED, AND THAT MAKES THESE DASHBOARDS SMALL
 * ===========================================================================
 * The exports report a firm with 144 matters, 64 projects, 118 corporate
 * clients, 14 tasks and 7 assigned matters. The fixtures hold six matters, four
 * projects, five clients and seven tasks across two people, and every figure on
 * every card is counted from those rows — the same rows the matters list, the
 * client portal, global search and the notification feed read.
 *
 * A bigger number demos better and could not survive a click, since every
 * "view all" lands on a list that would then disagree with the card that sent
 * you. The exports' own figures do not survive comparison with EACH OTHER: in
 * the two locales of a single screen, 118 clients against 48, a weekly target
 * of 150 against 180, "+14.2% MoM" against "+12%", and four weeks of chart data
 * reading 38/42/48/36.5 in English and 38/46/51/29.5 in Arabic.
 *
 * ---------------------------------------------------------------------------
 * REFUSED ON EVERY ONE OF THE FIVE SCREENS
 * ---------------------------------------------------------------------------
 *  · THE TENANT'S NAME, SPELLED BY THE SCREEN. Across the five exports the firm
 *    is "Al-Mansoor & Partners", "Al-Tamimi & Partners" (a real firm), "رم
 *    وشركاه" and "التميمي ومشاركوه" — in two cases a different name in each
 *    locale of the same page. fixtures/firm.ts is the single source of truth.
 *
 *  · THE JURISDICTION, now on its eleventh screen. ADGM, DIFC, DIAC, "UAE
 *    Federal Civil Code", "Dubai / Riyadh branch", "GST" on every timestamp,
 *    "Tenant ID: 9402-AE". The demo firm is in Cairo; Egyptian courts and
 *    Egyptian law appear nowhere in any of the ten files.
 *
 *  · REAL COMPANIES AS PARTIES. Maersk on the Partner export; Standard
 *    Chartered, ADNOC, ADIB and Al-Futtaim as clients here; and "Clyde & Co
 *    Opposing Counsel" — a real international firm, cast as the adversary in
 *    fabricated litigation. design.md §7 asks for realistic legal content; that
 *    does not extend to naming actual businesses as litigants.
 *
 *  · ESCROW, for the sixth through ninth time: "Shareholders Voting Escrow
 *    Addendum", "Virtual Escrow Session", "Gulf Logistics Buyout & Escrow
 *    Facility", "indemnity escrow terms". An Egyptian firm does not hold client
 *    money in an escrow account it runs itself, and it remains the most
 *    consequential thing these exports keep asserting.
 *
 *  · LIVE INTEGRATION CLAIMS: "DIFC/ADGM E-Courts Live", "بوابات المحاكم
 *    الإلكترونية: متصلة ونشطة", "Auto-sync with the iManage repository",
 *    "Source: eCourts Inbound Webhook", and a green dot beside each. Court
 *    filing and document management are Track B with nothing behind them.
 *
 *  · PRE-LOADED TIMERS reading 01:46:40, 02:14:38 and 01:24:12 against
 *    MAT-2201, on three different screens. Time nobody worked, on a figure that
 *    bills. Ours starts at zero and, on the one rank that does not bill, is not
 *    mounted at all.
 *
 *  · A LITERAL TEMPLATE PLACEHOLDER. The Legal Secretary export renders the
 *    string `{{CLIENT_LOGO}}` into the sidebar, in both locales.
 *
 *  · BUILD AND SESSION IDENTIFIERS IN THE CHROME: "v2.4.12-rc", "v4.8 Legal
 *    Core", "SESSION: LYS-892-SEC", "PARALEGAL CONSOLE". Console output, not
 *    product surface.
 *
 *  · UNTRANSLATED CHROME IN THE ARABIC BUILDS. The Arabic Junior Associate page
 *    keeps an English top bar ("Junior Associate Practice Portal", "Search
 *    matters, cases, documents...", "⌘K"); the Arabic Paralegal page keeps
 *    "PARALEGAL CONSOLE" and "Search matters, filings...". BUILD_PLAN.md §3
 *    names untranslated chrome as a concrete failure this batch exists to stop.
 */

/** Rendered per request — every date resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

export default async function StaffDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;

  // MOCK: the session resolves this in production, and the rank it returns is
  // what gates everything below. Nothing here checks a credential. Track A.5.
  const person = await mockApi.staff.currentStaff();
  const firstName = person.name[typedLocale].split(' ')[0];

  if (!hasDashboard(person.rank)) {
    return <DashboardNotBuilt firstName={firstName} />;
  }

  /*
   * One branch per rank, each loading only what its own screen renders.
   *
   * The repetition is the feature. A single `Promise.all` of everything with
   * the cards switched underneath would be shorter and would put the partner's
   * client roster and the firm's billing figures into every response, where
   * view-source reads them. What a rank cannot see, its request does not fetch.
   */
  if (person.rank === 'partner') {
    const [courtWeek, hearings, approvals, inbox, agenda, clients, billing] = await Promise.all([
      mockApi.staff.courtWeek(person.id),
      mockApi.staff.hearings(person.id),
      mockApi.staff.approvals(person.id),
      mockApi.staff.inbox(person.id),
      mockApi.staff.agenda(person.id),
      mockApi.staff.clients(),
      mockApi.staff.billing(person.id),
    ]);

    return (
      <PartnerDashboard
        locale={typedLocale}
        firstName={firstName}
        hearings={hearings}
        courtWeek={courtWeek}
        approvals={approvals}
        inbox={inbox.items}
        unreadCount={inbox.unreadCount}
        agenda={agenda}
        clients={clients.items}
        clientTotal={clients.total}
        billing={billing}
      />
    );
  }

  if (person.rank === 'seniorAssociate') {
    const [courtWeek, hearings, approvals, submissions, inbox, agenda, engagements, billing] = await Promise.all([
      mockApi.staff.courtWeek(person.id),
      mockApi.staff.hearings(person.id),
      mockApi.staff.approvals(person.id),
      mockApi.staff.submissions(person.id),
      mockApi.staff.inbox(person.id),
      mockApi.staff.agenda(person.id),
      mockApi.staff.engagements(person.id),
      mockApi.staff.billing(person.id),
    ]);

    return (
      <SeniorAssociateDashboard
        locale={typedLocale}
        firstName={firstName}
        hearings={hearings}
        courtWeek={courtWeek}
        approvals={approvals}
        submissions={submissions}
        inbox={inbox.items}
        unreadCount={inbox.unreadCount}
        agenda={agenda}
        engagements={engagements}
        billing={billing}
      />
    );
  }

  /*
   * A legal secretary. Nothing below is shared with the four ranks above:
   * no engagements, no submissions, no tasks, and crucially no billing()
   * call — that function throws for a rank with no hours row, which is the
   * behaviour that keeps a zero off this screen. See RANKS_THAT_BILL.
   */
  if (person.rank === 'legalSecretary') {
    const [courtWeek, hearings, supported, correspondence, agenda] = await Promise.all([
      mockApi.staff.courtWeek(person.id),
      mockApi.staff.hearings(person.id),
      mockApi.staff.supportedStaff(person.id),
      mockApi.staff.correspondence(person.id),
      mockApi.staff.agenda(person.id),
    ]);

    return (
      <LegalSecretaryDashboard
        locale={typedLocale}
        firstName={firstName}
        hearings={hearings}
        courtWeek={courtWeek}
        supported={supported}
        correspondence={correspondence.items}
        unreadCount={correspondence.unreadCount}
        agenda={agenda}
      />
    );
  }

  /*
   * A junior associate or a paralegal. Neither gets an `approvals()` call at
   * all: nothing is routed to either rank for sign-off, and an approvals queue
   * that is permanently empty implies one day it will not be. The two screens
   * read exactly the same six things — the ladder between them lives in the
   * data, not in a different arrangement of cards. See ParalegalDashboard.tsx.
   */
  const [courtWeek, hearings, submissions, tasks, inbox, agenda, engagements, billing] = await Promise.all([
    mockApi.staff.courtWeek(person.id),
    mockApi.staff.hearings(person.id),
    mockApi.staff.submissions(person.id),
    mockApi.staff.tasks(person.id),
    mockApi.staff.inbox(person.id),
    mockApi.staff.agenda(person.id),
    mockApi.staff.engagements(person.id),
    mockApi.staff.billing(person.id),
  ]);

  if (person.rank === 'paralegal') {
    return (
      <ParalegalDashboard
        locale={typedLocale}
        firstName={firstName}
        hearings={hearings}
        courtWeek={courtWeek}
        tasks={tasks}
        submissions={submissions}
        inbox={inbox.items}
        unreadCount={inbox.unreadCount}
        agenda={agenda}
        engagements={engagements}
        billing={billing}
      />
    );
  }

  return (
    <JuniorAssociateDashboard
      locale={typedLocale}
      firstName={firstName}
      hearings={hearings}
        courtWeek={courtWeek}
      submissions={submissions}
      tasks={tasks}
      inbox={inbox.items}
      unreadCount={inbox.unreadCount}
      agenda={agenda}
      engagements={engagements}
      billing={billing}
    />
  );
}
