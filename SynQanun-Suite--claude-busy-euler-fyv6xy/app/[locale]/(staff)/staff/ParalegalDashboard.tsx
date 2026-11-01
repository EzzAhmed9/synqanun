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
 * Paralegal Dashboard — the rank that raises work and never reviews it.
 *
 * ===========================================================================
 * WHY IT LOOKS ALMOST EXACTLY LIKE THE JUNIOR ASSOCIATE'S
 * ===========================================================================
 * Because it should. A paralegal and a junior associate do different work on
 * the same files, and what a dashboard answers for both is the same three
 * questions: what have I been asked to do, what have I sent on, and which
 * matters am I on. The ladder shows up in the DATA — Noor leads nothing,
 * supports four files, and has one submission where Huda has four — not in a
 * different arrangement of cards.
 *
 * The export takes the opposite view and gives this rank its own layout, its
 * own top bar ("PARALEGAL CONSOLE"), its own sidebar footer and a different
 * unread-badge style from the four screens beside it. That drift is what
 * BUILD_PLAN.md §"Build order" names as the reason this codebase has a
 * component library at all: five people in one firm should not have to learn
 * five products.
 *
 * ===========================================================================
 * "DOCUMENTS NEEDING FILING" IS NOT BUILT, AND HERE IS WHY
 * ===========================================================================
 * The export's largest card on this screen is a queue of documents awaiting
 * archiving into a document management system, with a "File document" button
 * per row, a source column reading "eCourts Inbound Webhook", and a footer
 * offering to "Open Document Management (DMS) Repository".
 *
 * There is no DMS. fixtures/documents.ts is the client-facing library — the
 * files the firm has SHARED with one client — and reading it as a filing queue
 * would mean showing a paralegal the client's own document list under a
 * heading that says the opposite. The button would then either fake an
 * archive or be the product's next silent no-op on the one screen whose entire
 * job is filing things correctly.
 *
 * MOCK: the DMS is Track B (BUILD_PLAN.md §6) and the inbound court-filing
 * webhook with it. When both exist this card is the first thing to build here.
 *
 * ---------------------------------------------------------------------------
 * ALSO NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · TWO DIFFERENT FIRMS ON ONE SCREEN. The English sidebar names the tenant
 *    "Al-Mansoor & Partners" while a panel in the same header reads "Retained
 *    Firm: Al-Tamimi & Partners" — a real firm, named as the employer of the
 *    person whose dashboard this is.
 *
 *  · "DIFC/ADGM E-Courts Live" with a green dot, and in Arabic "بوابات المحاكم
 *    الإلكترونية (DIFC & ADGM): متصلة ونشطة". A live court-filing integration
 *    asserted on the screen of the person who would have to rely on it.
 *
 *  · "Showing 5 of 14 assigned paralegal deliverables" over a list of five, and
 *    "Paralegal clearance granted across 7 total litigation and transactional
 *    records" over a grid of four. Two footers that restate a total the page
 *    cannot produce. Every count here is the length of what is rendered.
 *
 *  · A CLICKABLE COMPLETION TICK. The export ships a script that toggles a
 *    checkbox between `check_box_outline_blank` and `check_circle` with no
 *    persistence whatsoever — the state is gone on reload. Completing a task
 *    needs a record of who completed it and when; a tick that forgets is worse
 *    than no tick. See the MOCK note on `TasksCard`.
 *
 *  · "Court Deadline" as a solid error-red status on a task. A procedural
 *    deadline belongs to the engagement's timeline, which is the single source
 *    of truth for a court date; an internal task that falls near one does not
 *    get to restate it as though the court set it.
 *
 *  · "Apply anonymization rules per UAE Central Bank regulation compliance" and
 *    "certified courier with tracking reference #AE-9821" as task detail. A
 *    named regulator's rules and a courier consignment number, both invented.
 *
 *  · "Personal operational productivity tracking · Excludes partner-level
 *    realisation rates and billing matrices." A sentence that tells a paralegal
 *    they are being measured and that the measurement is not the one partners
 *    get. The hours card says what it counts and says the timer does not feed
 *    it — that is the whole of what this product knows.
 *
 *  · "PARALEGAL CONSOLE", "v2.4", "SynQanun Core — Operational" with a green
 *    dot, and "Tenant ID: 9402-AE". Build identifiers and liveness claims in
 *    the chrome; the Arabic page keeps the console label in English.
 */
export function ParalegalDashboard({
  locale,
  firstName,
  hearings,
  courtWeek,
  tasks,
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
  tasks: TaskRecord[];
  submissions: SubmissionRecord[];
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

export default ParalegalDashboard;
