import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TeamsJoinSlot } from '@/components/meetings/TeamsJoinSlot';
import { Badge, Card, buttonClasses, tabTriggerClasses } from '@/components/ui';
import {
  addDays,
  formatCalendarDate,
  formatClockTime,
  formatMonthYear,
  tenantZoneOffset,
  type CalendarDate,
} from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { CalendarEntry } from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../StaffChrome';
import { DayList, MonthGrid, TimeGrid } from './CalendarViews';

export type CalendarView = 'month' | 'week' | 'day';

/**
 * The calendar's chrome: a toolbar, a view, and a panel for whatever is open.
 *
 * A Server Component, like the Unified Inbox and for the same reason — every
 * control here is a link to a different URL, so there is no state for a client
 * component to hold.
 */
export function CalendarWorkspace({
  locale,
  view,
  anchor,
  today,
  days,
  entries,
  selected,
  month,
}: {
  locale: Locale;
  view: CalendarView;
  anchor: CalendarDate;
  today: CalendarDate;
  days: CalendarDate[];
  entries: CalendarEntry[];
  selected: CalendarEntry | null;
  month: string;
}) {
  const t = useTranslations('calendar');

  /** Where prev/next go, in the unit the current view is showing. */
  const step = view === 'month' ? 'month' : view === 'week' ? 7 : 1;
  const shift = (direction: -1 | 1): CalendarDate => {
    if (step === 'month') {
      const [year, monthNumber] = anchor.split('-').map(Number);
      const moved = new Date(Date.UTC(year, monthNumber - 1 + direction, 1, 12));
      return moved.toISOString().slice(0, 10);
    }
    return addDays(anchor, step * direction);
  };

  const query: Record<string, string> = { view, date: anchor };

  return (
    <>
      <StaffTopBar
        title={t('title')}
        // What is actually on screen, counted. The export's subtitle claims a
        // live Microsoft 365 connection instead.
        subtitle={t('subtitle', { count: entries.length })}
      />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-4 px-6 py-6">
        {/* Toolbar ----------------------------------------------------- */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav
            aria-label={t('views.label')}
            className="flex gap-1 border-b border-gray-200"
          >
            {(['month', 'week', 'day'] as CalendarView[]).map((value) => (
              <Link
                key={value}
                href={{ pathname: '/staff/calendar', query: { view: value, date: anchor } }}
                aria-current={value === view ? 'page' : undefined}
                className={cn(tabTriggerClasses(value === view), 'whitespace-nowrap')}
              >
                {t(`views.${value}`)}
              </Link>
            ))}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            {/* Directions, so they mirror in Arabic. design.md §12. */}
            <Link
              href={{ pathname: '/staff/calendar', query: { view, date: shift(-1) } }}
              aria-label={t('previous')}
              className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'w-9 px-0' })}
            >
              <ChevronLeft aria-hidden size={16} className="rtl:rotate-180" />
            </Link>

            <Link
              href={{ pathname: '/staff/calendar', query: { view } }}
              className={buttonClasses({ variant: 'secondary', size: 'sm' })}
            >
              {t('today')}
            </Link>

            <Link
              href={{ pathname: '/staff/calendar', query: { view, date: shift(1) } }}
              aria-label={t('next')}
              className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'w-9 px-0' })}
            >
              <ChevronRight aria-hidden size={16} className="rtl:rotate-180" />
            </Link>

            <span className="ms-1 text-body font-medium text-gray-700 [unicode-bidi:isolate]">
              {view === 'day'
                ? formatCalendarDate(anchor, locale, { month: 'long' })
                : view === 'week'
                  ? t('range', {
                      from: formatCalendarDate(days[0], locale, { year: false }),
                      to: formatCalendarDate(days[days.length - 1], locale, { month: 'long' }),
                    })
                  : formatMonthYear(anchor, locale)}
            </span>

            {/* Derived from the tenant's timezone, never stated. */}
            <Badge tone="neutral" icon={null}>
              <span dir="ltr">{tenantZoneOffset(locale)}</span>
            </Badge>
          </div>
        </div>

        {/* View + detail panel ----------------------------------------- */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 desktop:flex-row">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {view === 'month' ? (
              <MonthGrid
                days={days}
                entries={entries}
                locale={locale}
                today={today}
                month={month}
                activeId={selected?.id ?? null}
                query={query}
              />
            ) : view === 'week' ? (
              <TimeGrid
                days={days}
                entries={entries}
                locale={locale}
                today={today}
                activeId={selected?.id ?? null}
                query={query}
              />
            ) : (
              <DayList
                day={anchor}
                entries={entries}
                locale={locale}
                activeId={selected?.id ?? null}
                query={query}
              />
            )}
          </div>

          {selected ? (
            <EntryPanel entry={selected} locale={locale} view={view} anchor={anchor} />
          ) : null}
        </div>
      </main>
    </>
  );
}

/* ===========================================================================
 * What an entry opens to
 * ======================================================================== */

/**
 * The detail panel.
 *
 * ===========================================================================
 * WHAT IT DOES NOT HAVE
 * ===========================================================================
 * No Join button, because there is no meeting link and no video integration. No
 * AI minutes and no extracted action items, because nothing read the meeting and
 * there is no assignment write to hang an action item on. No "Export minutes to
 * matter DMS", because there is no DMS. No attendee avatars with presence dots.
 * The export has all of them and they are all assertions about systems that do
 * not exist.
 *
 * ===========================================================================
 * IT DOES NOW HAVE ONE LINK TO MINUTES, AND ONLY WHERE THERE ARE MINUTES
 * ===========================================================================
 * Batch 7 built the transcript reader, so the flat refusal of a transcript tab
 * that used to stand here has narrowed rather than gone. What is still refused
 * is everything that implied a recorder: the export's "Transcript ready" badge
 * on a live event, its "Companion Active" pulse, and "AI Meeting Companion •
 * Verified Docket Summary". Nothing in this product records, transcribes or
 * summarises a meeting.
 *
 * What exists is written sample minutes for two past internal meetings, and the
 * link appears only when `entry.hasTranscript` — which is false for a future
 * meeting, for a client meeting, for a court date, and for a meeting this reader
 * was not in. A link that resolved to a 404 would be the calendar claiming
 * minutes exist and then denying it one click later. See the reader's own header
 * and fixtures/transcripts.ts.
 *
 * The panel's other link is the one thing the grid cannot fit and the product
 * genuinely knows: where the entry came from. A court date links to the matter
 * whose timeline it is on — so a reader can go and read the record the date was
 * derived from, which is the honest version of "open in DMS".
 */
/** The entries that are meetings rather than court dates or filings. */
const MEETING_KINDS = new Set<CalendarEntry['kind']>(['internal', 'client', 'conference']);

function EntryPanel({
  entry,
  locale,
  view,
  anchor,
}: {
  entry: CalendarEntry;
  locale: Locale;
  view: CalendarView;
  anchor: CalendarDate;
}) {
  const t = useTranslations('calendar');

  const engagementHref =
    entry.engagementRef && entry.engagementKind
      ? // One register since October 2026: a former project opens there too.
        `/staff/matters/${entry.engagementRef}`
      : null;

  return (
    <Card
      padding="none"
      className="flex shrink-0 flex-col overflow-hidden desktop:w-[340px]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-gray-200 p-5">
        <div className="min-w-0">
          <Badge tone={entry.source === 'engagement' ? 'warning' : 'neutral'} icon={null}>
            {t(`kinds.${entry.kind}`)}
          </Badge>
          <h2 className="mt-2 font-sans text-title text-gray-700">
            <bdi>{entry.title[locale]}</bdi>
          </h2>
        </div>

        <Link
          href={{ pathname: '/staff/calendar', query: { view, date: anchor } }}
          aria-label={t('close')}
          className="shrink-0 rounded-sm p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600"
        >
          <X aria-hidden size={16} />
        </Link>
      </header>

      <dl className="flex flex-col gap-3 p-5 text-caption">
        <div>
          <dt className="text-gray-500">{t('panel.when')}</dt>
          <dd className="mt-0.5 text-body text-gray-700 [unicode-bidi:isolate]">
            {formatCalendarDate(entry.on, locale, { month: 'long' })}
            {entry.at ? ` · ${formatClockTime(entry.at, locale)}` : ` · ${t('allDay')}`}
          </dd>
          {/* A length, only where one is recorded. A hearing has none — see
              CalendarEntry — and this does not invent one. */}
          {entry.minutes !== null ? (
            <dd className="mt-0.5 text-caption text-gray-500">
              {t('panel.minutes', { count: entry.minutes })}
            </dd>
          ) : (
            <dd className="mt-0.5 text-caption text-gray-500">{t('panel.noTime')}</dd>
          )}
        </div>

        <div>
          <dt className="text-gray-500">
            {entry.source === 'meeting' ? t('panel.where') : t('panel.detail')}
          </dt>
          <dd className="mt-0.5 text-body text-gray-700">
            <bdi>{entry.detail[locale]}</bdi>
          </dd>
        </div>

        {entry.engagementRef ? (
          <div>
            <dt className="text-gray-500">{t('panel.engagement')}</dt>
            <dd className="mt-0.5">
              {/*
                Where the date actually lives. Neither staff list is built yet,
                so this resolves to the translated 404 — an answer, rather than
                a click that does nothing.
              */}
              <Link
                href={engagementHref ?? '/staff/matters'}
                className="font-mono text-reference text-legal-navy hover:underline"
                dir="ltr"
              >
                {entry.engagementRef}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>

      {/*
        A meeting still ahead — the firm's own internal and client meetings,
        and a conference on a matter's timeline — gets the Teams slot: a
        labelled placeholder, not an integration. Hearings are in court.
      */}
      {!entry.past && MEETING_KINDS.has(entry.kind) ? (
        <div className="border-t border-gray-200 px-5 py-4">
          <TeamsJoinSlot meetingTitle={entry.title[locale]} />
        </div>
      ) : null}

      {/*
        Present only where there are minutes to read, never disabled — the same
        rule the nav and the bulk bar follow for a control a reader cannot use.
        `hasTranscript` is resolved server-side in mockApi.staff.calendar and is
        already scoped to this person's own meetings.
      */}
      {entry.hasTranscript ? (
        <div className="border-t border-gray-200 px-5 py-4">
          <Link
            href={`/staff/calendar/${entry.id}/transcript`}
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            <FileText aria-hidden size={15} />
            {t('panel.transcript')}
          </Link>
        </div>
      ) : null}

      {/*
        Says where the entry came from, in words. A meeting is the firm's own
        record; a court date is read from the matter's timeline and cannot be
        edited here, which is worth saying on the screen that looks most like
        somewhere you would edit it.
      */}
      <p className="mt-auto border-t border-gray-200 p-5 text-caption text-gray-500">
        {entry.source === 'engagement' ? t('panel.fromTimeline') : t('panel.fromFirm')}
      </p>
    </Card>
  );
}

export default CalendarWorkspace;
