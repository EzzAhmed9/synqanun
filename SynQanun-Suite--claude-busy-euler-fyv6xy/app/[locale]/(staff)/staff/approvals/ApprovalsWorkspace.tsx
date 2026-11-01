import { ArrowLeft, BadgeCheck, PenLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Card, EmptyState, tabTriggerClasses } from '@/components/ui';
import { formatCalendarDate, formatMoney, formatRelativeDays } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import {
  APPROVAL_QUEUE_FILTERS,
  type ApprovalQueue,
  type ApprovalQueueFilter,
  type QueuedApproval,
} from '@/lib/mock-api';
import type { ApprovalKind } from '@/fixtures/practice';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../StaffChrome';
import { CardHead } from '../cards';
import { TwoPane } from '../TwoPane';

/**
 * The queue, and whichever request the URL names.
 *
 * ===========================================================================
 * NO CLIENT COMPONENT
 * ===========================================================================
 * The Unified Inbox needs one for its search box; this screen has none,
 * because a reviewer's queue is a handful of decisions they are expected to
 * read rather than a corpus to query. So every narrowing here is a view, every
 * one is a real link, and the whole thing renders on the server — the same
 * call Billing made for the same reason.
 *
 * The layout is shared with the inbox. See ../TwoPane.tsx.
 */
export function ApprovalsWorkspace({
  locale,
  queue,
  state,
  kind,
  itemInUrl,
}: {
  locale: Locale;
  queue: ApprovalQueue;
  state: ApprovalQueueFilter;
  kind?: ApprovalKind;
  itemInUrl: boolean;
}) {
  const t = useTranslations('staffApprovals');

  /** Keeps every other parameter while changing one. */
  const href = (next: { state?: ApprovalQueueFilter; kind?: ApprovalKind; item?: string }) => ({
    pathname: '/staff/approvals' as const,
    query: {
      ...(next.state && next.state !== 'pending' ? { state: next.state } : {}),
      ...(next.kind ? { kind: next.kind } : {}),
      ...(next.item ? { item: next.item } : {}),
    },
  });

  return (
    <>
      <StaffTopBar
        title={t('title')}
        subtitle={t('subtitle', { count: queue.counts.pending })}
      />

      <main className="mx-auto flex w-full min-h-0 max-w-content flex-1 flex-col px-6 py-6">
        {/* The queue defaults to what is undecided, because that is what a
            reviewer opens it for. Counts are over the whole queue.

            Absent on an empty queue, where all four would read zero and each
            one leads back to the same screen — the kind strip below already
            hides itself on the same reasoning, and the client portal's
            documents screen drops its filter strip for it. */}
        {queue.counts.all === 0 ? null : (
        <nav
          aria-label={t('states.label')}
          className="flex gap-1 overflow-x-auto border-b border-gray-200"
        >
          {APPROVAL_QUEUE_FILTERS.map((value) => (
            <Link
              key={value}
              href={href({ state: value, kind })}
              aria-current={value === state ? 'page' : undefined}
              className={cn(tabTriggerClasses(value === state), 'whitespace-nowrap')}
            >
              {t(`states.${value}`)}
              {/* Latin digits in both locales — design.md §12. */}
              <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                {queue.counts[value]}
              </span>
            </Link>
          ))}
        </nav>
        )}

        {/* Kinds present in this queue, derived — so no option returns nothing. */}
        {queue.kinds.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-1">
            <Link
              href={href({ state })}
              aria-current={kind === undefined ? 'page' : undefined}
              className={cn(tabTriggerClasses(kind === undefined), 'whitespace-nowrap')}
            >
              {t('kinds.all')}
            </Link>
            {queue.kinds.map((facet) => (
              <Link
                key={facet.value}
                href={href({ state, kind: facet.value as ApprovalKind })}
                aria-current={kind === facet.value ? 'page' : undefined}
                className={cn(tabTriggerClasses(kind === facet.value), 'whitespace-nowrap')}
              >
                {t(`kinds.${facet.value}`)}
                <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                  {facet.count}
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        <TwoPane
          listLabel={t('listLabel')}
          readingLabel={t('readingLabel')}
          selectionInUrl={itemInUrl}
          list={
            /*
              AN EMPTY QUEUE IS THE GOOD DAY, AND IT IS NOT A FILTER MISS.
              `counts.all` is the reader's whole queue before the state tabs and
              the kind tabs, so zero there means nothing has been sent to them —
              which is a normal end-of-week state and deserves saying so, rather
              than "no request in your queue is in this state" over a queue that
              has no requests in any state.
            */
            queue.items.length === 0 ? (
              <EmptyState
                icon={BadgeCheck}
                title={queue.counts.all === 0 ? t('empty.noneTitle') : t('empty.title')}
                body={queue.counts.all === 0 ? t('empty.noneBody') : t('empty.body')}
                className="m-4 border-dashed"
              />
            ) : (
              <ul className="divide-y divide-gray-200 overflow-y-auto">
                {queue.items.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={href({ state, kind, item: row.id })}
                      aria-current={queue.selected?.id === row.id ? 'page' : undefined}
                      className={cn(
                        'block p-4 transition-colors hover:bg-gray-50',
                        queue.selected?.id === row.id &&
                          'bg-gray-100 border-s-2 border-action'
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral" icon={null}>
                          {t(`kinds.${row.kind}`)}
                        </Badge>
                        <StateBadge row={row} t={t} />
                      </span>
                      <span className="mt-1.5 block text-body-emphasis text-gray-700">
                        <bdi>{row.title[locale]}</bdi>
                      </span>
                      <span className="mt-0.5 block text-caption text-gray-500">
                        {t('from', { name: row.submittedBy[locale] })}
                        {' · '}
                        <bdi>{row.clientName[locale]}</bdi>
                      </span>
                      <span className="mt-1 block text-caption text-gray-500 [unicode-bidi:isolate]">
                        {row.state === 'pending'
                          ? t('dueOn', {
                              date: formatCalendarDate(row.dueOn, locale, { month: 'short' }),
                            })
                          : t('decidedOn', {
                              date: row.decidedOn
                                ? formatRelativeDays(row.decidedOn, locale)
                                : '—',
                            })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )
          }
          reading={
            queue.selected ? (
              <ReadingPane approval={queue.selected} locale={locale} />
            ) : (
              <EmptyState
                icon={BadgeCheck}
                title={itemInUrl ? t('gone.title') : t('noSelection.title')}
                body={itemInUrl ? t('gone.body') : t('noSelection.body')}
                className="m-4 border-dashed"
              />
            )
          }
        />
      </main>
    </>
  );
}

/**
 * The state, and how late it is if that still means anything.
 *
 * Only a pending request can be overdue. Badging a decided one "3 days late"
 * would be reporting a deadline it is no longer racing.
 */
function StateBadge({
  row,
  t,
}: {
  row: QueuedApproval;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  if (row.state === 'approved') {
    return <Badge tone="success">{t('states.approved')}</Badge>;
  }
  if (row.state === 'changesRequested') {
    return (
      <Badge tone="neutral" icon={null}>
        {t('states.changesRequested')}
      </Badge>
    );
  }
  if (row.daysOverdue > 0) {
    return <Badge tone="error">{t('overdue', { count: row.daysOverdue })}</Badge>;
  }
  if (row.dueToday) {
    return <Badge tone="warning">{t('dueToday')}</Badge>;
  }
  return (
    <Badge tone="info" icon={null}>
      {t('states.pending')}
    </Badge>
  );
}

/* ===========================================================================
 * The request itself
 * ======================================================================== */

function ReadingPane({ approval, locale }: { approval: QueuedApproval; locale: Locale }) {
  const t = useTranslations('staffApprovals');
  const tRank = useTranslations('ranks');

  return (
    <article className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="border-b border-gray-200 p-5">
        {/* Below 1280px the panes take turns, so this is the way back. A real
            link that drops ?item=, not a history call. */}
        <Link
          href={{ pathname: '/staff/approvals', query: {} }}
          className="mb-3 inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline desktop:hidden"
        >
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {t('backToQueue')}
        </Link>

        <span className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral" icon={null}>
            {t(`kinds.${approval.kind}`)}
          </Badge>
          <StateBadge row={approval} t={t} />
        </span>

        <h2 className="mt-2 text-title text-gray-700">
          <bdi>{approval.title[locale]}</bdi>
        </h2>

        {/* A quote's figure is the thing being decided, so it is not buried in
            the fact list. Everything else has no number at all. */}
        {approval.amount !== null && approval.currency !== null ? (
          <p className="mt-2 font-mono text-title text-gray-700 [unicode-bidi:isolate]">
            {formatMoney(approval.amount, approval.currency, locale)}
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-5 p-5">
        <dl className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
          <Fact label={t('facts.client')}>
            <Link
              href={`/staff/clients/${approval.clientId}`}
              className="text-legal-navy hover:underline"
            >
              <bdi>{approval.clientName[locale]}</bdi>
            </Link>
          </Fact>

          <Fact label={t('facts.engagement')}>
            {approval.engagementRef && approval.engagementKind ? (
              <Link
                href={`/staff/matters/${approval.engagementRef}`}
                className="hover:underline"
              >
                <span dir="ltr" className="font-mono text-reference text-legal-navy">
                  {approval.engagementRef}
                </span>
                {approval.engagementTitle ? (
                  <span className="mt-0.5 block text-caption text-gray-500">
                    <bdi>{approval.engagementTitle[locale]}</bdi>
                  </span>
                ) : null}
              </Link>
            ) : (
              // A fee quote can precede any engagement at all — that is what a
              // quote is for. Saying so beats an empty cell.
              <span className="text-gray-500">{t('facts.noEngagement')}</span>
            )}
          </Fact>

          <Fact label={t('facts.raisedBy')}>
            <bdi>{approval.submittedBy[locale]}</bdi>
            <span className="mt-0.5 block text-caption text-gray-500">
              {tRank(`holder.${approval.submittedByRank}`)}
            </span>
          </Fact>

          <Fact label={t('facts.with')}>
            <bdi>{approval.assignedTo[locale]}</bdi>
          </Fact>
        </dl>

        {/* What happened to it, from what the fixtures actually record ---- */}
        <Card padding="none" className="overflow-hidden">
          <header className="border-b border-gray-200 p-5">
            <CardHead icon={PenLine} heading={t('trail.heading')} caption={t('trail.caption')} />
          </header>
          <ol className="divide-y divide-gray-200">
            <TrailStep
              done
              label={t('trail.raised', { name: approval.submittedBy[locale] })}
              date={formatRelativeDays(approval.raisedOn, locale)}
            />
            <TrailStep
              done
              label={t('trail.assigned', { name: approval.assignedTo[locale] })}
              date={null}
            />
            {approval.state === 'pending' ? (
              <TrailStep
                done={false}
                label={t('trail.awaiting')}
                date={formatCalendarDate(approval.dueOn, locale, { month: 'short' })}
              />
            ) : (
              <TrailStep
                done
                label={
                  approval.state === 'approved'
                    ? t('trail.approved')
                    : t('trail.changesRequested')
                }
                date={
                  approval.decidedOn ? formatRelativeDays(approval.decidedOn, locale) : null
                }
              />
            )}
          </ol>
        </Card>

        <DecidingNotBuilt />
      </div>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-body text-gray-700">{children}</dd>
    </div>
  );
}

function TrailStep({
  done,
  label,
  date,
}: {
  done: boolean;
  label: string;
  date: string | null;
}) {
  return (
    <li className="flex items-start gap-3 p-4">
      <span
        aria-hidden
        className={cn(
          'mt-1.5 h-2 w-2 shrink-0 rounded-pill',
          done ? 'bg-gray-300' : 'bg-legal-navy'
        )}
      />
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-2">
        <span className={done ? 'text-body text-gray-500' : 'text-body-emphasis text-gray-700'}>
          <bdi>{label}</bdi>
        </span>
        {date ? (
          <span className="text-caption text-gray-500 [unicode-bidi:isolate]">{date}</span>
        ) : null}
      </span>
    </li>
  );
}

/**
 * Where the decision controls would be.
 *
 * ===========================================================================
 * A NOTE, NOT THREE BUTTONS
 * ===========================================================================
 * The export ships Approve / Request Changes / Reject, and all three lie:
 * Approve turns green after a timeout, Reject collects a reason in a
 * `prompt()` and throws it away, Request Changes alerts that it is opening a
 * panel that does not exist. Writes are Batch 6.
 *
 * Greyed-out buttons would be the other wrong answer. BUILD_PLAN and the nav's
 * own note agree that a disabled control tells someone what they are not
 * ALLOWED to do — and a partner is perfectly entitled to decide this; the
 * product simply cannot record it yet. Those are different statements and the
 * reader deserves the true one.
 *
 * So: no control, and one line saying why — the same treatment Billing gives
 * its missing time ledger, and for the same reason. Someone shown this
 * prototype will look for the Approve button, and "not built" and "not
 * permitted" must not be confusable.
 */
function DecidingNotBuilt() {
  const t = useTranslations('staffApprovals.deciding');

  return (
    <Card padding="lg" className="border-dashed bg-gray-50">
      <CardHead icon={BadgeCheck} heading={t('heading')} caption={t('caption')} />
      <p className="mt-3 text-body text-gray-600">{t('body')}</p>
      <p className="mt-2 text-caption text-gray-500">{t('state')}</p>
    </Card>
  );
}
