import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui';
import {
  formatClockTime,
  formatDayOfMonth,
  formatWeekday,
  minutesOfDay,
  type CalendarDate,
} from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { CalendarEntry } from '@/lib/mock-api';
import { WEEKEND_DAYS } from '@/fixtures/availability';
import { weekdayOf } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The three ways of looking at the same entries.
 *
 * ===========================================================================
 * ONE DATA FUNCTION, THREE LAYOUTS
 * ===========================================================================
 * Month, week and day all render `mockApi.staff.calendar(staffId, from, to)`
 * over a different range. Nothing here filters or re-derives — a view that
 * computed its own idea of what is on a day is a view that can disagree with
 * the other two, and with the dashboard's agenda card, which reads the same
 * meetings and the same timelines.
 *
 * ===========================================================================
 * TIMED ENTRIES SIT ON THE GRID; COURT DATES SIT ABOVE IT
 * ===========================================================================
 * A firm meeting has a start and a length, so it can be placed and sized. A
 * hearing has neither — fixtures/engagements.ts records the day a matter is
 * listed and no hour, because nobody told the product one. Those go in the
 * all-day row.
 *
 * That row is the honest version of what the export does instead: it gives its
 * "DIFC Court CFI-042/2025 Oral Submissions" a 09:30–11:30 block, a platform
 * badge and a duration, none of which anything knows.
 *
 * ===========================================================================
 * THE GRID'S BOUNDS COME FROM THE ENTRIES
 * ===========================================================================
 * Not a hardcoded 08:00–18:00. A meeting at 07:30 would simply not be drawn by
 * a fixed window, and a calendar that silently omits an entry is worse than one
 * that scrolls. The hours are widened to contain everything on screen, with a
 * working-day minimum so an empty week still looks like a week.
 */

/** Height of one hour, in pixels. The only magic number in the grid. */
const HOUR_PX = 56;

/** The window an empty day still shows, so the grid is not one thin strip. */
const DEFAULT_FIRST_HOUR = 8;
const DEFAULT_LAST_HOUR = 18;

function isWeekend(date: CalendarDate): boolean {
  return WEEKEND_DAYS.includes(weekdayOf(date));
}

/** The hour range that contains every timed entry, padded to whole hours. */
function gridHours(entries: CalendarEntry[]): number[] {
  let first = DEFAULT_FIRST_HOUR;
  let last = DEFAULT_LAST_HOUR;

  for (const entry of entries) {
    if (!entry.at || entry.minutes === null) continue;
    const start = minutesOfDay(entry.at);
    first = Math.min(first, Math.floor(start / 60));
    last = Math.max(last, Math.ceil((start + entry.minutes) / 60));
  }

  return Array.from({ length: last - first }, (_, index) => first + index);
}

/* ===========================================================================
 * A single entry, wherever it is drawn
 * ======================================================================== */

/**
 * The tone an entry wears.
 *
 * Court dates and filings are the firm's hard deadlines, so they carry the one
 * accent; everything else is neutral. design.md §4 keeps syn-red rare, which is
 * exactly why it is worth something here — the export colours every entry by
 * video platform (blue Zoom, indigo Teams, teal Meet), which spends the whole
 * palette on which piece of software somebody dials into.
 */
function entryTone(entry: CalendarEntry): 'court' | 'client' | 'internal' {
  if (entry.source === 'engagement') return 'court';
  return entry.kind === 'client' ? 'client' : 'internal';
}

const TONE_CLASSES: Record<'court' | 'client' | 'internal', string> = {
  court: 'border-s-2 border-s-action bg-action/5 text-gray-700',
  client: 'border-s-2 border-s-legal-navy bg-legal-navy/5 text-gray-700',
  internal: 'border-s-2 border-s-gray-300 bg-gray-50 text-gray-600',
};

function entryHref(entry: CalendarEntry, query: Record<string, string>) {
  return { pathname: '/staff/calendar', query: { ...query, event: entry.id } };
}

/* ===========================================================================
 * Overlapping entries
 * ======================================================================== */

/** A timed entry with its minutes resolved and its column worked out. */
interface PlacedEntry {
  entry: CalendarEntry;
  /** Minutes from midnight. */
  start: number;
  end: number;
  /** Which column within its overlapping group, from the reading start. */
  lane: number;
  /** How many columns that group needs. 1 means full width. */
  lanes: number;
}

/**
 * Where each timed entry sits when two of them are on at once.
 *
 * ===========================================================================
 * WHAT THIS REPLACES, AND HOW IT WAS FOUND
 * ===========================================================================
 * Every block used to be drawn at `inset-x-1` — the full width of its day
 * column — so two meetings that overlapped were painted one on top of the
 * other, and the later one covered the tail of the earlier one. Not truncated,
 * not stacked: hidden, with nothing on screen to say a second meeting was
 * there.
 *
 * It had never surfaced because no two fixture meetings were ever on the same
 * day at overlapping times. Batch 7's transcript reader needed a past internal
 * meeting and put one at 11:00 against a client kick-off that ran 10:00 to
 * 11:15, which drew the second block over the first one's last fifteen minutes.
 * That meeting was moved out of the way at the time rather than shipping the
 * defect; now that the grid handles it, it is back where it was — see
 * fixtures/practice.ts.
 *
 * A calendar hiding a double-booking is the worst failure this screen has. The
 * one thing a fee earner opens a week view to find out is whether they are in
 * two places at once.
 *
 * ===========================================================================
 * THE ALGORITHM, AND WHY IT IS THE SIMPLE ONE
 * ===========================================================================
 * Entries are grouped into CLUSTERS of transitively overlapping blocks — A
 * overlaps B and B overlaps C puts all three in one cluster even where A and C
 * do not touch, because they still have to share the column's width. Within a
 * cluster, each entry takes the first lane whose previous occupant has already
 * finished, which is the standard greedy interval-colouring and uses the
 * fewest lanes possible. Every entry in a cluster is then drawn at the same
 * width, `1 / lanes`.
 *
 * Equal widths rather than letting a block expand into free lanes to its side.
 * That refinement gives back some room in uneven clusters of three or more, and
 * it is real work to get right for a case nothing in this product produces: the
 * demo's only overlap is a pair. A wrong expansion would put a block over its
 * neighbour again, which is the exact bug being fixed here.
 *
 * Ordering is by start, then by the longer meeting first, then by id — stable,
 * so the same week never renders two different ways.
 */
function placeEntries(entries: CalendarEntry[]): PlacedEntry[] {
  const timed = entries
    .filter((entry) => entry.at !== null && entry.minutes !== null)
    .map((entry) => {
      const start = minutesOfDay(entry.at as string);
      return { entry, start, end: start + (entry.minutes as number) };
    })
    .sort(
      (a, b) => a.start - b.start || b.end - a.end || a.entry.id.localeCompare(b.entry.id)
    );

  const placed: PlacedEntry[] = [];
  let cluster: { entry: CalendarEntry; start: number; end: number }[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    if (cluster.length === 0) return;

    /** The minute each lane frees up. A lane is reusable once it has. */
    const laneEnds: number[] = [];
    const laneOf = new Map<CalendarEntry, number>();

    for (const item of cluster) {
      // `<=` and not `<`: a meeting starting exactly when another ends does not
      // overlap it, and forcing those two into separate lanes would halve the
      // width of every back-to-back pair in the diary.
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[lane] = item.end;
      }
      laneOf.set(item.entry, lane);
    }

    for (const item of cluster) {
      placed.push({ ...item, lane: laneOf.get(item.entry) ?? 0, lanes: laneEnds.length });
    }

    cluster = [];
    clusterEnd = -1;
  };

  for (const item of timed) {
    // Sorted by start, so anything beginning at or after the cluster's furthest
    // end cannot overlap anything already in it.
    if (item.start >= clusterEnd) closeCluster();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  closeCluster();

  return placed;
}

/* ===========================================================================
 * Week and day — the same grid, over seven columns or one
 * ======================================================================== */

export function TimeGrid({
  days,
  entries,
  locale,
  today,
  activeId,
  query,
}: {
  days: CalendarDate[];
  entries: CalendarEntry[];
  locale: Locale;
  today: CalendarDate;
  activeId: string | null;
  query: Record<string, string>;
}) {
  const t = useTranslations('calendar');
  const hours = gridHours(entries);
  const firstHour = hours[0] ?? DEFAULT_FIRST_HOUR;

  const byDay = new Map<CalendarDate, CalendarEntry[]>();
  for (const day of days) byDay.set(day, []);
  for (const entry of entries) byDay.get(entry.on)?.push(entry);

  const hasAllDay = entries.some((entry) => entry.at === null);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-card border border-gray-200 bg-white">
      {/* Day headers ------------------------------------------------- */}
      <div
        className="grid shrink-0 border-b border-gray-200 bg-gray-50"
        style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {/* The zone the clock times below are in, derived from the tenant's
            timezone rather than stated. The export prints "GST (UTC+4)" on a
            Cairo firm. */}
        <div className="border-e border-gray-200 p-2 text-center text-caption text-gray-500 [unicode-bidi:isolate]">
          {t('zone')}
        </div>

        {days.map((day) => {
          const isToday = day === today;
          return (
            <div
              key={day}
              className={cn(
                'border-e border-gray-200 p-2 text-center last:border-e-0',
                isWeekend(day) && 'bg-gray-100',
                isToday && 'bg-action/5'
              )}
            >
              <span
                className={cn(
                  'block text-caption',
                  isToday ? 'font-medium text-action-pressed' : 'text-gray-500'
                )}
              >
                {formatWeekday(day, locale)}
              </span>
              <span
                className={cn(
                  'font-mono text-body [unicode-bidi:isolate]',
                  isToday ? 'font-medium text-action-pressed' : 'text-gray-700'
                )}
              >
                {formatDayOfMonth(day, locale)}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day row -------------------------------------------------- */}
      {hasAllDay ? (
        <div
          className="grid shrink-0 border-b border-gray-200"
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div className="border-e border-gray-200 p-2 text-caption text-gray-500">
            {t('allDay')}
          </div>
          {days.map((day) => (
            <div
              key={day}
              className={cn(
                'space-y-1 border-e border-gray-200 p-1 last:border-e-0',
                isWeekend(day) && 'bg-gray-100/60'
              )}
            >
              {(byDay.get(day) ?? [])
                .filter((entry) => entry.at === null)
                .map((entry) => (
                  <EntryChip
                    key={entry.id}
                    entry={entry}
                    locale={locale}
                    isActive={entry.id === activeId}
                    query={query}
                  />
                ))}
            </div>
          ))}
        </div>
      ) : null}

      {/* Hour grid ---------------------------------------------------- */}
      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: `4rem repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {/* Hour labels */}
        <div className="border-e border-gray-200">
          {hours.map((hour) => (
            <div
              key={hour}
              className="relative border-b border-gray-100 text-end pe-2"
              style={{ height: HOUR_PX }}
            >
              <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                {formatClockTime(`${String(hour).padStart(2, '0')}:00`, locale)}
              </span>
            </div>
          ))}
        </div>

        {days.map((day) => (
          <div
            key={day}
            className={cn(
              'relative border-e border-gray-200 last:border-e-0',
              isWeekend(day) && 'bg-gray-100/60',
              day === today && 'bg-action/[0.02]'
            )}
          >
            {/* Hour lines, so a block can be read against the scale. */}
            {hours.map((hour) => (
              <div key={hour} className="border-b border-gray-100" style={{ height: HOUR_PX }} />
            ))}

            {placeEntries(byDay.get(day) ?? []).map(({ entry, start, lane, lanes }) => {
              const top = ((start - firstHour * 60) / 60) * HOUR_PX;
              const height = ((entry.minutes as number) / 60) * HOUR_PX;
              const shared = lanes > 1;
              /*
                The gap each side of a block. 4px on a block that has the column
                to itself, which is exactly where `inset-x-1` used to put it, so
                nothing moves on a day with no overlap. 2px once a column is
                shared, because the gutter is there to separate blocks and the
                space it costs is scarcer the more of them there are — four of
                those pixels are the difference between a clock time that fits
                and one that clips.
              */
              const gap = shared ? 2 : 4;

              return (
                <Link
                  key={entry.id}
                  href={entryHref(entry, query)}
                  aria-current={entry.id === activeId ? 'true' : undefined}
                  className={cn(
                    'absolute overflow-hidden rounded-sm transition-colors',
                    shared ? 'px-1 py-1.5' : 'p-1.5',
                    TONE_CLASSES[entryTone(entry)],
                    entry.past && 'opacity-60',
                    // A block sharing its column needs an edge of its own, or
                    // two abutting ones of the same tone read as one wide block.
                    shared && 'border border-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]',
                    entry.id === activeId && 'ring-2 ring-action/30'
                  )}
                  /*
                    `insetInlineStart` and not `left`: lane 0 is the READING
                    start, so in Arabic the first of two overlapping meetings
                    sits on the right and the second to its left. The old
                    `inset-x-1` was symmetric and needed no logical variant; a
                    lane offset does.
                  */
                  style={{
                    top,
                    height: Math.max(height, 22),
                    insetInlineStart: `calc(${(lane * 100) / lanes}% + ${gap}px)`,
                    width: `calc(${100 / lanes}% - ${gap * 2}px)`,
                  }}
                >
                  {/*
                    Truncated, both lines, and in Arabic the time really does
                    clip once a column is shared: `formatClockTime` gives ar-EG
                    a twelve-hour time, "10:00 ص" wants 66px, and half of a
                    seven-column week on a laptop is 61px. No amount of padding
                    buys that back.

                    Left to clip rather than hidden, because the meridiem is not
                    the only thing that says morning: the block sits against the
                    hour axis, which is rendering "10:00 ص" a few pixels to its
                    side in the same view. Dropping the line below some width
                    would take away a time that fits on a wider screen to
                    prevent an ambiguity the grid already resolves.

                    Neither line is the only copy of what it says. The block's
                    position IS the time, and the panel behind a click carries
                    both in full.
                  */}
                  <span className="block truncate font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                    {formatClockTime(entry.at as string, locale)}
                  </span>
                  <span className="block truncate text-caption font-medium">
                    <bdi>{entry.title[locale]}</bdi>
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===========================================================================
 * Month
 * ======================================================================== */

export function MonthGrid({
  days,
  entries,
  locale,
  today,
  month,
  activeId,
  query,
}: {
  days: CalendarDate[];
  entries: CalendarEntry[];
  locale: Locale;
  today: CalendarDate;
  /** "2026-09" — days outside it are dimmed. */
  month: string;
  activeId: string | null;
  query: Record<string, string>;
}) {
  const t = useTranslations('calendar');

  const byDay = new Map<CalendarDate, CalendarEntry[]>();
  for (const day of days) byDay.set(day, []);
  for (const entry of entries) byDay.get(entry.on)?.push(entry);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-card border border-gray-200 bg-white">
      <div className="grid shrink-0 grid-cols-7 border-b border-gray-200 bg-gray-50">
        {days.slice(0, 7).map((day) => (
          <div
            key={day}
            className="border-e border-gray-200 p-2 text-center text-caption text-gray-500 last:border-e-0"
          >
            {formatWeekday(day, locale)}
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayEntries = byDay.get(day) ?? [];
          const outsideMonth = !day.startsWith(month);

          return (
            <div
              key={day}
              className={cn(
                'min-h-[104px] space-y-1 border-b border-e border-gray-200 p-1.5',
                isWeekend(day) && 'bg-gray-100/60',
                outsideMonth && 'bg-gray-50/80'
              )}
            >
              <span
                className={cn(
                  'inline-flex h-5 min-w-5 items-center justify-center rounded-pill px-1 font-mono text-reference [unicode-bidi:isolate]',
                  day === today
                    ? 'bg-action text-white'
                    : outsideMonth
                      ? 'text-gray-500'
                      : 'text-gray-600'
                )}
              >
                {formatDayOfMonth(day, locale)}
              </span>

              {/* Three, then a count — never a silent truncation. */}
              {dayEntries.slice(0, 3).map((entry) => (
                <EntryChip
                  key={entry.id}
                  entry={entry}
                  locale={locale}
                  isActive={entry.id === activeId}
                  query={query}
                  withTime
                />
              ))}
              {dayEntries.length > 3 ? (
                <span className="block ps-1 text-caption text-gray-500">
                  {t('more', { count: dayEntries.length - 3 })}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===========================================================================
 * The chip both grids use
 * ======================================================================== */

function EntryChip({
  entry,
  locale,
  isActive,
  query,
  withTime = false,
}: {
  entry: CalendarEntry;
  locale: Locale;
  isActive: boolean;
  query: Record<string, string>;
  withTime?: boolean;
}) {
  return (
    <Link
      href={entryHref(entry, query)}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'flex items-center gap-1 rounded-sm px-1.5 py-1 text-caption transition-colors',
        TONE_CLASSES[entryTone(entry)],
        entry.past && 'opacity-60',
        isActive && 'ring-2 ring-action/30'
      )}
    >
      {withTime && entry.at ? (
        <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
          {formatClockTime(entry.at, locale)}
        </span>
      ) : null}
      <span className="truncate">
        <bdi>{entry.title[locale]}</bdi>
      </span>
    </Link>
  );
}

/* ===========================================================================
 * Day — a list rather than a one-column grid
 * ======================================================================== */

/**
 * The day view is a LIST, not a single-column time grid.
 *
 * A grid earns its vertical axis by letting you compare columns; with one
 * column there is nothing to compare, and the axis becomes empty space between
 * two meetings. A list gives each entry its detail instead — which is the one
 * thing the week grid cannot show.
 */
export function DayList({
  day,
  entries,
  locale,
  activeId,
  query,
}: {
  day: CalendarDate;
  entries: CalendarEntry[];
  locale: Locale;
  activeId: string | null;
  query: Record<string, string>;
}) {
  const t = useTranslations('calendar');

  if (entries.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-card border border-dashed border-gray-200 bg-white p-10 text-center">
        <div>
          <p className="text-body font-medium text-gray-700">{t('empty.title')}</p>
          <p className="mt-1 text-caption text-gray-500">
            {isWeekend(day) ? t('empty.weekend') : t('empty.body')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="min-h-0 flex-1 divide-y divide-gray-200 overflow-auto rounded-card border border-gray-200 bg-white">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link
            href={entryHref(entry, query)}
            aria-current={entry.id === activeId ? 'true' : undefined}
            className={cn(
              'flex items-start gap-3 p-4 ps-[14px] transition-colors',
              entry.id === activeId
                ? 'border-s-2 border-action bg-gray-50'
                : 'border-s-2 border-transparent hover:bg-gray-50'
            )}
          >
            <span className="w-20 shrink-0 font-mono text-reference text-gray-600 [unicode-bidi:isolate]">
              {entry.at ? formatClockTime(entry.at, locale) : t('allDay')}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-body text-gray-700">
                <bdi>{entry.title[locale]}</bdi>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-gray-500">
                <bdi>{entry.detail[locale]}</bdi>
                {entry.engagementRef ? (
                  <>
                    <span aria-hidden className="text-gray-300">·</span>
                    {/* Latin in every locale — see lib/format.ts. */}
                    <span dir="ltr" className="font-mono text-reference">
                      {entry.engagementRef}
                    </span>
                  </>
                ) : null}
              </p>
            </div>

            <Badge tone={entry.source === 'engagement' ? 'warning' : 'neutral'} icon={null}>
              {t(`kinds.${entry.kind}`)}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
