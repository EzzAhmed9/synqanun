import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n/routing';
import type {
  AgendaEntry,
  BillingSummary,
  EngagementAssignment,
  InboxItemRecord,
  SubmissionRecord,
  TaskRecord,
} from '@/lib/mock-api';
import { AlarmClock, CalendarClock, ClipboardCheck, Gavel, Inbox as InboxIcon, ListChecks } from 'lucide-react';
import { HEARINGS_WINDOW_DAYS, type CourtWeek, type HearingRecord } from '@/lib/mock-api';
import { StaffTopBar } from '../StaffChrome';
import { Bento, BentoCell, MueenTile, todayLine } from './bento';
import { CounterTile, CourtWeekTile, HoursBarsTile, HoursRingTile, WorkChecklist } from './tiles';
import { AgendaCard, BillingCard, InboxCard, QuickActions } from './cards';
import { EngagementsCard, SubmissionsCard, TasksCard } from './work-cards';

/**
 * Junior Associate Dashboard — work in, work out, and nobody else's queue.
 *
 * ===========================================================================
 * THE DIFFERENCE FROM THE RANK ABOVE IS ONE MISSING CARD
 * ===========================================================================
 * A senior associate has both an approvals queue and a submissions list. This
 * rank has the submissions list and no queue, because nothing is routed to a
 * junior associate for sign-off — `mockApi.staff.approvals(id)` returns an
 * empty array for this person, and rather than render an empty "waiting on
 * you" card the screen does not ask the question.
 *
 * That is a deliberate call and worth stating: an empty card is not neutral. A
 * permanently empty approvals queue on a junior's dashboard implies they are
 * one day going to approve something from here, and the first time it filled
 * up it would be because somebody misrouted a filing.
 *
 * ===========================================================================
 * TASKS AND SUBMISSIONS ARE NOT THE SAME LIST
 * ===========================================================================
 * A task is unfinished work somebody asked for; a submission is finished work
 * waiting on a decision. They have different owners, different end states and
 * different consequences for running late — see the header of `demoTasks`. The
 * export folds the distinction away on this screen and calls the result "My
 * Submissions (4 Active)", then puts an item marked "Approved" inside it.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE SLA BANNER. "Review SLA Reminder: Cross-Border Due Diligence Schedule
 *    revisions are due to Tariq Al-Rahman by 18:00 GST today", in a warning
 *    ribbon above everything else. A service-level commitment invented by a
 *    design tool, attached to a named colleague, on the screen of the most
 *    junior person it binds. Second instance after the Partner export's
 *    "Threshold SLA: 4 Hours".
 *
 *  · "Direct Supervision: Tariq Al-Rahman" under the page title. A reporting
 *    line printed on someone's own dashboard reads as a warning rather than as
 *    information. Who is holding each submission is shown per row instead,
 *    where it is actually useful.
 *
 *  · "Q1 2025" as a chip beside the heading, and "March 2025" hardcoded into
 *    the billing card, on a product whose dates all resolve against the
 *    tenant's clock.
 *
 *  · "67.5% completed · Benchmark: 65.0% for mid-month" and "On Track (+4.2
 *    hrs pacing)". A pacing score against a benchmark nobody set. The hours
 *    card shows hours and a weekly target, which is what the fixture records.
 *
 *  · "18.0 hrs Unbilled WIP Awaiting Review · 3 draft entries pending
 *    supervisory audit". There are no time entries in Track A at all — the
 *    timer discards its own seconds — so a figure for work-in-progress awaiting
 *    audit is three inventions stacked on each other.
 *
 *  · "My Clients (3 Assigned) — View-only access". Every engagement in the
 *    fixtures belongs to one client, so a scoped client list is a list of one;
 *    and an access level announced as a badge is the "greyed-out control"
 *    pattern the Settings governance note rejects.
 *
 *  · THE ARABIC PAGE'S ENGLISH CHROME. Its top bar still reads "Junior
 *    Associate Practice Portal", "Operational View", "Search matters, cases,
 *    documents..." and "⌘K" in the middle of an RTL page. BUILD_PLAN.md §3
 *    names untranslated chrome as a concrete failure this batch exists to stop.
 *
 *  · THE ARABIC PAGE'S COLOUR INVERSION: "Ask AI Assistant" rendered as a solid
 *    legal-navy button while the person's own "submit for review" is a white
 *    outline — which says, by weight alone, that the machine is the more
 *    important actor. design.md §7.
 *
 *  · "جلسة العمل: متصل بالخادم الإقليمي (ADGM)" — "session: connected to the
 *    regional server (ADGM)" — and "الاعتمادات موثقة بالختم المشفر", "approvals
 *    notarised with an encrypted seal". A residency claim and a cryptographic
 *    claim, neither with anything behind it.
 *
 *  · A "file_download" icon on every "view all" link, in both locales. Those
 *    links navigate; none of them downloads anything.
 */
export function JuniorAssociateDashboard({
  locale,
  firstName,
  hearings,
  courtWeek,
  submissions,
  tasks,
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
  submissions: SubmissionRecord[];
  tasks: TaskRecord[];
  inbox: InboxItemRecord[];
  unreadCount: number;
  agenda: AgendaEntry[];
  engagements: EngagementAssignment[];
  billing: BillingSummary;
}) {
  const t = useTranslations('staffDashboard');
  const tk = useTranslations('staffDashboard.kpi');
  const open = tasks.filter((task) => task.state !== 'done');
  const dueToday = open.filter((task) => task.dueToday).length;
  const overdue = open.filter((task) => task.daysOverdue > 0).length;

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
                { key: 'tasksDue', count: dueToday },
                { key: 'overdue', count: overdue },
                { key: 'unread', count: unreadCount },
              ]} />
          </BentoCell>
          <BentoCell span={5}>
            <CounterTile label={tk('label')} counters={[
                { icon: ListChecks, label: tk('openTasks'), value: open.length },
                { icon: CalendarClock, label: tk('dueToday'), value: dueToday },
                { icon: AlarmClock, label: tk('overdue'), value: overdue, tone: 'alert' },
                { icon: Gavel, label: tk('hearings'), value: hearings.length, hint: tk('hearingsHint', { days: HEARINGS_WINDOW_DAYS }), href: '/staff/calendar' },
              ]} />
          </BentoCell>

          {/* The dark feature tile, two rows tall, beside the court week. */}
          <BentoCell span={4} tall>
            <WorkChecklist locale={locale} agenda={agenda} tasks={tasks} />
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

export default JuniorAssociateDashboard;
