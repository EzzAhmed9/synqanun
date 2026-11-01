import { Briefcase, CheckSquare, ListChecks, Scale, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Card, buttonClasses } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatCalendarDate } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type {
  ApprovalRecord,
  EngagementAssignment,
  SubmissionRecord,
  TaskRecord,
} from '@/lib/mock-api';
import type { BadgeTone } from '@/components/ui';
import { CardHead } from './cards';

/**
 * The cards about WORK — what is waiting, what was sent, what is assigned, and
 * which files a person is on.
 *
 * Split from cards.tsx only because that file was becoming the whole staff side
 * in one scroll. The division is by subject, not by importance: cards.tsx holds
 * the four every fee earner sees regardless of what they do (inbox, agenda,
 * hours, digest); this holds the four that describe the work itself.
 */

/* ===========================================================================
 * Approvals — what is waiting on this person
 * ======================================================================== */

/**
 * Decisions this person owes someone.
 *
 * ===========================================================================
 * THERE IS NO ONE-CLICK "APPROVE", ON ANY RANK'S SCREEN
 * ===========================================================================
 * The export puts a syn-red Approve on every row of both the Partner and the
 * Senior Associate dashboards. Approving a filing or a fee quote is the act
 * that sends a document out under the firm's name; doing it from a summary
 * without opening the draft is not a shortcut worth designing, and building the
 * button would mean either faking the approval or wiring the product's most
 * consequential action to a no-op.
 *
 * Review is a LINK, to a route that does not exist yet, so it resolves to the
 * translated 404 rather than taking a click and doing nothing.
 *
 * MOCK: /staff/approvals is Batch 5 (BUILD_PLAN.md §3), where the document is
 * read before it is signed.
 */
export function ApprovalsCard({
  approvals,
  locale,
  heading,
  className,
}: {
  approvals: ApprovalRecord[];
  locale: Locale;
  /**
   * Overrides the card title.
   *
   * The dashboards address the reader — "Waiting on you", "Your files" — which
   * is exactly wrong on a client’s record, where the same rows belong to the
   * CLIENT and not to whoever is looking. Found in the browser on the CRM
   * detail screen, reading "Your files" over another organisation’s matters.
   */
  heading?: string;
  className?: string;
}) {
  const t = useTranslations('staffDashboard.approvals');

  return (
    <Card padding="none" className={cn('rounded-[var(--syn-tile-radius)] overflow-hidden', className)}>
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={Scale}
          tone="accent"
          heading={heading ?? t('heading')}
          // Counted from the rows below, in the same render.
          caption={t('caption', { count: approvals.length })}
        />
      </header>

      {approvals.length === 0 ? (
        <p className="p-5 text-body text-gray-600">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {approvals.map((approval) => (
            <li key={approval.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0 flex-1">
                <p className="text-body-emphasis text-gray-700">
                  <bdi>{approval.title[locale]}</bdi>
                </p>

                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-gray-600">
                  {/* Who sent it, resolved from the staff record rather than
                      written beside it. No honorific — see practice.ts. */}
                  <span>{t('submittedBy', { name: approval.submittedBy[locale] })}</span>
                  {approval.engagementRef ? (
                    <>
                      <span aria-hidden className="text-gray-300">·</span>
                      <span dir="ltr" className="font-mono text-reference">
                        {approval.engagementRef}
                      </span>
                    </>
                  ) : null}
                  <span aria-hidden className="text-gray-300">·</span>
                  <span>
                    <bdi>{approval.clientName[locale]}</bdi>
                  </span>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {/* Computed from the due date, never asserted beside it. */}
                {approval.daysOverdue > 0 ? (
                  <Badge tone="error">{t('overdue', { count: approval.daysOverdue })}</Badge>
                ) : approval.dueToday ? (
                  <Badge tone="warning">{t('dueToday')}</Badge>
                ) : (
                  <Badge tone="neutral" icon={null}>
                    {t('due', { date: formatCalendarDate(approval.dueOn, locale) })}
                  </Badge>
                )}

                <Link
                  href="/staff/approvals"
                  className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                >
                  {t('review')}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ===========================================================================
 * Submissions — what this person sent up
 * ======================================================================== */

const SUBMISSION_TONE: Record<SubmissionRecord['state'], BadgeTone> = {
  pending: 'neutral',
  changesRequested: 'warning',
  approved: 'success',
};

/**
 * The other side of the approvals queue: drafts this person raised, and who is
 * holding them.
 *
 * ===========================================================================
 * IT IS THE SAME ROW, NOT A SECOND LIST
 * ===========================================================================
 * `mockApi.staff.submissions` reads the collection `approvals` reads, filtered
 * the other way. A senior associate's outbox and the partner's inbox are
 * therefore guaranteed to describe the same object. The export builds them as
 * two hand-written lists and they already disagree: its Junior Associate screen
 * shows "Corporate Resolution for Facility Signing — Approved by Tariq
 * Al-Rahman", and no such item appears anywhere on the partner's own dashboard.
 *
 * ===========================================================================
 * NO ACTIONS, AND A "CHANGES REQUESTED" ROW IS NOT AN ERROR
 * ===========================================================================
 * Nothing here is clickable, because there is nothing honest for it to do — the
 * draft would open in the Document Canvas, which is Batch 5. And the state
 * badge for `changesRequested` is WARNING, not error: a reviewer sending work
 * back is the review working, not a failure, and design.md §2 reserves the
 * error tone (and its near-syn-red hue) for validation and failed actions.
 */
export function SubmissionsCard({
  submissions,
  locale,
  className,
}: {
  submissions: SubmissionRecord[];
  locale: Locale;
  className?: string;
}) {
  const t = useTranslations('staffDashboard.submissions');

  return (
    <Card padding="none" className={cn('rounded-[var(--syn-tile-radius)] overflow-hidden', className)}>
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={Send}
          heading={t('heading')}
          caption={t('caption', { count: submissions.length })}
        />
      </header>

      {submissions.length === 0 ? (
        <p className="p-5 text-body text-gray-600">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {submissions.map((submission) => (
            <li
              key={submission.id}
              className="flex flex-wrap items-start justify-between gap-3 p-5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-body-emphasis text-gray-700">
                  <bdi>{submission.title[locale]}</bdi>
                </p>

                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-gray-600">
                  {/* Who has it now. Resolved from the record, not written
                      beside it — and no "(Lead Partner)" suffix: the rank is
                      the person's, and the export appends it to a name on every
                      row as though it were part of the name. */}
                  <span>{t('with', { name: submission.assignedTo[locale] })}</span>
                  {submission.engagementRef ? (
                    <>
                      <span aria-hidden className="text-gray-300">·</span>
                      <span dir="ltr" className="font-mono text-reference">
                        {submission.engagementRef}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>

              <Badge tone={SUBMISSION_TONE[submission.state]} icon={null}>
                {t(`state.${submission.state}`)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ===========================================================================
 * Tasks — work delegated to this person
 * ======================================================================== */

/**
 * What someone has been asked to do.
 *
 * URGENCY IS THE DUE DATE AND NOTHING ELSE. The export marks one row "Court
 * Deadline" in solid error red and adds, above the list, a banner reading
 * "Review SLA Reminder: ... due by 18:00 GST today". A procedural deadline
 * belongs to the engagement's timeline — fixtures/engagements.ts is the single
 * source of truth for a court date — and an internal task that happens to fall
 * near one does not get to restate it as though the court set it.
 *
 * MOCK: nothing here changes a state. Completing a task needs an audit trail of
 * who completed it and when, which is Track A.5; a checkbox that forgot on
 * reload would be worse than no checkbox. The export ships exactly that — a
 * script that toggles a tick with no persistence at all.
 */
export function TasksCard({
  tasks,
  locale,
  heading,
  showAssignee = false,
  className,
}: {
  tasks: TaskRecord[];
  locale: Locale;
  /**
   * Overrides the card title. Same reason EngagementsCard takes one: the
   * dashboards address the reader, and a matter's task list belongs to the
   * file rather than to whoever opened it.
   */
  heading?: string;
  /**
   * Name who holds each task instead of which engagement it is on.
   *
   * On a dashboard the engagement is the useful half — these are all YOUR
   * tasks, spread across files. On a matter it is the opposite: every row is
   * on this file already, and "who has it" is the thing being asked.
   */
  showAssignee?: boolean;
  className?: string;
}) {
  const t = useTranslations('staffDashboard.tasks');
  const open = tasks.filter((task) => task.state !== 'done');

  return (
    <Card padding="none" className={cn('rounded-[var(--syn-tile-radius)] overflow-hidden', className)}>
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={ListChecks}
          tone="accent"
          heading={heading ?? t('heading')}
          // Counts the OPEN rows, and says so, while the list below shows the
          // finished ones too. A caption reading "5 active" over a list of five
          // that includes a completed item is the export's card.
          caption={t('caption', { count: open.length })}
        />
      </header>

      {tasks.length === 0 ? (
        <p className="p-5 text-body text-gray-600">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {tasks.map((task) => (
            <li key={task.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0 flex-1">
                <p
                  className={
                    task.state === 'done'
                      ? 'text-body text-gray-600 line-through'
                      : 'text-body-emphasis text-gray-700'
                  }
                >
                  <bdi>{task.title[locale]}</bdi>
                </p>

                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-gray-600">
                  <span>{t('from', { name: task.assignedBy[locale] })}</span>
                  <span aria-hidden className="text-gray-300">·</span>
                  {showAssignee ? (
                    <span>{t('with', { name: task.assignedTo[locale] })}</span>
                  ) : (
                    <span dir="ltr" className="font-mono text-reference">
                      {task.engagementRef}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {task.state === 'done' ? (
                  <Badge tone="success">{t('state.done')}</Badge>
                ) : task.daysOverdue > 0 ? (
                  <Badge tone="error">{t('overdue', { count: task.daysOverdue })}</Badge>
                ) : task.dueToday ? (
                  <Badge tone="warning">{t('dueToday')}</Badge>
                ) : (
                  <Badge tone="neutral" icon={null}>
                    {t('due', { date: formatCalendarDate(task.dueOn, locale) })}
                  </Badge>
                )}

                {task.state === 'inProgress' ? (
                  <Badge tone="info" icon={null}>
                    {t('state.inProgress')}
                  </Badge>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ===========================================================================
 * Engagements — the files this person is on
 * ======================================================================== */

/**
 * Matters and projects this person leads or supports, with the job they do.
 *
 * ===========================================================================
 * WHY THIS REPLACES THE PARTNER'S TWO COUNT CARDS
 * ===========================================================================
 * A partner is shown how the firm's book is distributed — six matters, four
 * projects, how many need attention. Everyone below a partner is shown the
 * files themselves, because a senior associate does not supervise the book;
 * they work five of its rows. Rendering the firm-wide counts on their screen
 * would be handing them a management view of data they cannot act on, which is
 * the same mistake the rank-filtered nav exists to prevent.
 *
 * ===========================================================================
 * THE ROLE IS A JOB, NOT A TITLE
 * ===========================================================================
 * "Drafting", "evidence", "filings" — what the person does on this file. The
 * export writes "Lead Associate", "Senior Drafter" and "Reviewer" beside the
 * same three clients, which invents a second hierarchy running alongside the
 * five ranks the product already has.
 *
 * `lead` is derived from the engagement itself (fixtures/matters.ts carries
 * `leadCounsel` because the client is told who it is); the rest come from
 * `demoSupportAssignments`. Neither is written down twice.
 */
export function EngagementsCard({
  engagements,
  locale,
  heading,
}: {
  engagements: EngagementAssignment[];
  locale: Locale;
  /**
   * Overrides the card title.
   *
   * The dashboards address the reader — "Waiting on you", "Your files" — which
   * is exactly wrong on a client’s record, where the same rows belong to the
   * CLIENT and not to whoever is looking. Found in the browser on the CRM
   * detail screen, reading "Your files" over another organisation’s matters.
   */
  heading?: string;
}) {
  const t = useTranslations('staffDashboard.engagements');
  const active = engagements.filter((row) => row.active);

  return (
    <Card padding="none" className="h-full rounded-[var(--syn-tile-radius)] overflow-hidden">
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={Briefcase}
          heading={heading ?? t('heading')}
          caption={t('caption', { count: active.length })}
        />
      </header>

      {engagements.length === 0 ? (
        <p className="p-5 text-body text-gray-600">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {engagements.map((engagement) => (
            <li
              key={engagement.reference}
              className="flex flex-wrap items-start justify-between gap-3 p-5"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-body-emphasis text-gray-700">
                  <bdi>{engagement.title[locale]}</bdi>
                  {/* Latin in both locales — see lib/format.ts. */}
                  <span dir="ltr" className="font-mono text-reference text-gray-600">
                    {engagement.reference}
                  </span>
                </p>
                {/* The engagement's own status line — the same words the client
                    is shown on their portal, not a second summary of it. */}
                <p className="mt-1 text-caption text-gray-600">
                  <bdi>{engagement.status[locale]}</bdi>
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {/* The reader's part in it, where they have one; otherwise who
                    at the firm runs it. See `EngagementAssignment.role`. */}
                {engagement.role === 'lead' ? (
                  <Badge tone="info" icon={<CheckSquare aria-hidden size={13} />}>
                    {t('role.lead')}
                  </Badge>
                ) : engagement.role ? (
                  <Badge tone="neutral" icon={null}>
                    {t(`role.${engagement.role}`)}
                  </Badge>
                ) : engagement.leadName ? (
                  <Badge tone="neutral" icon={null}>
                    {t('ledBy', { name: engagement.leadName[locale] })}
                  </Badge>
                ) : null}
                {engagement.active ? null : (
                  <Badge tone="neutral" icon={null}>
                    {t('closed')}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
