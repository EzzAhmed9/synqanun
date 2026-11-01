import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n/routing';
import type {
  AgendaEntry,
  ApprovalRecord,
  BillingSummary,
  EngagementAssignment,
  InboxItemRecord,
  SubmissionRecord,
} from '@/lib/mock-api';
import { AlarmClock, CalendarClock, ClipboardCheck, Gavel, Inbox as InboxIcon, ListChecks } from 'lucide-react';
import { HEARINGS_WINDOW_DAYS, type CourtWeek, type HearingRecord } from '@/lib/mock-api';
import { StaffTopBar } from '../StaffChrome';
import { Bento, BentoCell, MueenTile, todayLine } from './bento';
import { CounterTile, CourtWeekTile, HoursBarsTile, HoursRingTile, WorkChecklist } from './tiles';
import { AgendaCard, BillingCard, InboxCard, QuickActions } from './cards';
import { ApprovalsCard, EngagementsCard, SubmissionsCard } from './work-cards';

/**
 * Senior Associate Dashboard — the rank that looks in both directions.
 *
 * ===========================================================================
 * WHAT MAKES THIS SCREEN DIFFERENT FROM EVERY OTHER ONE
 * ===========================================================================
 * It is the only dashboard with an approvals queue AND a submissions list. A
 * senior associate reviews what a junior associate and a paralegal send up, and
 * sends their own work on to a partner — so the same collection appears twice
 * on one page, filtered two ways, and the pair is the clearest statement of the
 * ladder anywhere in the product.
 *
 * `mockApi.staff.approvals` and `mockApi.staff.submissions` read the SAME rows.
 * That is deliberate and load-bearing: the row this screen shows as "with the
 * partner" is the row the partner's own dashboard shows as "waiting on you".
 * The export builds the two lists by hand and they already contradict each
 * other — see the header of `SubmissionsCard`.
 *
 * ===========================================================================
 * WHAT THIS RANK DOES NOT GET, AND WHY
 * ===========================================================================
 *  · THE FIRM'S CLIENT ROSTER. Partner data. Every engagement in the fixtures
 *    belongs to the one portal client, so a scoped "my clients" is a list of
 *    one; the export shows "My Clients (5 Assigned)" with standing labels
 *    invented for the card.
 *
 *  · FIRM-WIDE PRACTICE COUNTS. A senior associate works five files; they do
 *    not supervise a book of six matters and four projects. `EngagementsCard`
 *    shows the files instead.
 *
 *  · THE LEGAL DATABASE SEARCH CARD, with its four citation chips. It is Batch
 *    5 and has no rows behind it, and the chips name ADGM and DIFC statutes for
 *    a firm in Cairo.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · A REAL FIRM AS THE TENANT. Both locales head the sidebar "Al-Tamimi &
 *    Partners" / "التميمي ومشاركوه" — an actual law firm, named as the demo
 *    tenant. fixtures/firm.ts is the single source of truth and no screen may
 *    spell the tenant's name itself.
 *
 *  · THE JURISDICTION, again: "ADGM CFI", "DIFC Court of First Instance",
 *    "DIAC", "UAE Federal Arbitration Law Art. 27", "GST" on every timestamp.
 *    The firm is in Cairo. Egyptian law appears nowhere in either version.
 *
 *  · ONE-CLICK APPROVE on every review row — see `ApprovalsCard`.
 *
 *  · "$80,580 Billable Value Generated" and "Rate: $680/hr". A revenue figure
 *    attributed to one named employee, in US dollars, on an Egyptian firm whose
 *    currency the onboarding wizard already asks for. The hours card shows
 *    hours, which is what the fixture records.
 *
 *  · "84.6% of monthly pacing" over a hardcoded "March 2025". The month is the
 *    tenant's clock, and a pacing percentage against a target nobody set is a
 *    performance score invented by a layout.
 *
 *  · THE PRE-LOADED TIMER at 01:46:40 against MAT-2201 — time nobody worked, on
 *    a figure that bills. Ours starts at zero. See StaffChrome.tsx.
 *
 *  · "SynQanun OS" / "نظام سين قانون" with a green "Engine Connected" dot in
 *    the sidebar footer, and "v2.4.12-rc" beside it. A build identifier and a
 *    liveness claim, in the product chrome.
 *
 *  · PHOSPHOR ICONS — a third icon set, after the Partner export's Material
 *    Symbols. BUILD_PLAN.md §1 names lucide-react as the single neutral set.
 *
 *  · An "AI Reports" nav entry carrying a "PRO" badge. A pricing tier in the
 *    sidebar of a product with no plans, no billing and no upsell.
 */
export function SeniorAssociateDashboard({
  locale,
  firstName,
  hearings,
  courtWeek,
  approvals,
  submissions,
  inbox,
  unreadCount,
  agenda,
  engagements,
  billing,
}: {
  locale: Locale;
  firstName: string;
  hearings: HearingRecord[];
  courtWeek: CourtWeek;
  approvals: ApprovalRecord[];
  submissions: SubmissionRecord[];
  inbox: InboxItemRecord[];
  unreadCount: number;
  agenda: AgendaEntry[];
  engagements: EngagementAssignment[];
  billing: BillingSummary;
}) {
  const t = useTranslations('staffDashboard');
  const tk = useTranslations('staffDashboard.kpi');
  const overdue = approvals.filter((row) => row.daysOverdue > 0).length;

  return (
    <>
      <StaffTopBar title={t('homeTitle')} subtitle={todayLine(locale)} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-4 px-6 py-8 max-tablet:px-4 max-tablet:py-5">
        <QuickActions />

        <Bento>
          {/* معين first: what the assistant can tell you about today. */}
          <BentoCell span={7}>
            <MueenTile name={firstName} locale={locale} matterRef={hearings[0]?.reference ?? null} facts={[
                { key: 'agendaToday', count: agenda.length },
                { key: 'decisions', count: approvals.length },
                { key: 'overdue', count: overdue },
                { key: 'unread', count: unreadCount },
              ]} />
          </BentoCell>
          <BentoCell span={5}>
            <CounterTile label={tk('label')} counters={[
                { icon: ClipboardCheck, label: tk('decisions'), value: approvals.length, href: '/staff/approvals' },
                { icon: AlarmClock, label: tk('overdue'), value: overdue, tone: 'alert', href: '/staff/approvals' },
                { icon: Gavel, label: tk('hearings'), value: hearings.length, hint: tk('hearingsHint', { days: HEARINGS_WINDOW_DAYS }), href: '/staff/calendar' },
                { icon: InboxIcon, label: tk('unread'), value: unreadCount, href: '/staff/inbox' },
              ]} />
          </BentoCell>

          {/* The dark feature tile, two rows tall, beside the court week. */}
          <BentoCell span={4} tall>
            <WorkChecklist locale={locale} agenda={agenda} approvals={approvals} />
          </BentoCell>
          <BentoCell span={8}>
            <CourtWeekTile week={courtWeek} hearings={hearings} locale={locale} />
          </BentoCell>
          <BentoCell span={3}>
            <HoursRingTile billing={billing} locale={locale} />
          </BentoCell>
          <BentoCell span={5} tabletHalf>
            <HoursBarsTile billing={billing} />
          </BentoCell>

          <BentoCell span={7}>
            <InboxCard items={inbox} unreadCount={unreadCount} locale={locale} />
          </BentoCell>
          <BentoCell span={5}>
            <SubmissionsCard submissions={submissions} locale={locale} />
          </BentoCell>

          <BentoCell span={12}>
            <EngagementsCard engagements={engagements} locale={locale} />
          </BentoCell>
        </Bento>
      </main>
    </>
  );
}

export default SeniorAssociateDashboard;
