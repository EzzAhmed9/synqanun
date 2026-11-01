import { AlertTriangle, CalendarRange, Check, Clock3, ListChecks, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  formatCalendarDate,
  formatClockTime,
  formatDayOfMonth,
  formatWeekday,
  tenantNow,
} from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type {
  AgendaEntry,
  ApprovalRecord,
  BillingSummary,
  CourtEventKind,
  CourtWeek,
  HearingRecord,
  TaskRecord,
} from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { HoursChart } from './HoursChart';
import { HearingsTimeline } from './bento';
import { LogTimeModal } from './time/LogTimeModal';

/**
 * The Phase 4b tiles: louder than the cards they sit beside, and built from
 * the same data. Big display numerals for the counters, one dark feature tile,
 * a week grid for the court calendar, and a ring and a bar chart for hours.
 *
 * THE RULES THEY KEEP. Meezan's tokens only. No glow, no gradient, no shadow:
 * every surface is flat, and the hatching on weekend columns is an SVG line
 * pattern, not a gradient. Text is AA on every surface it sits on — on the
 * charcoal tile it is white (9.42:1) or white at 80% (6.74:1), and gold is
 * used there only for check circles and icons, never for words.
 */

const TILE = 'rounded-[var(--syn-tile-radius)]';

/* ===========================================================================
 * Counters — big display numerals with a small label
 * ======================================================================== */

export interface Counter {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  /** Error colour on the numeral, only above zero — icon and label carry it too. */
  tone?: 'neutral' | 'alert';
  href?: string;
}

/**
 * Four counters in one tile, 2×2 at every width. The numerals are the dataviz
 * "hero figure": 56px, Cairo light, tabular figures, Western digits.
 */
export function CounterTile({ label, counters }: { label: string; counters: Counter[] }) {
  return (
    <section
      aria-label={label}
      className={cn(TILE, 'grid h-full grid-cols-2 overflow-hidden border border-gray-200 bg-white')}
    >
      {counters.map((counter, index) => {
        const alert = counter.tone === 'alert' && counter.value > 0;
        const Icon = counter.icon;
        const body = (
          <>
            <span className="flex items-center gap-2 text-caption font-medium text-gray-600">
              <Icon
                aria-hidden
                size={15}
                strokeWidth={1.8}
                className={alert ? 'text-error' : 'text-gray-500'}
              />
              {counter.label}
            </span>
            <span className="mt-4 block">
              <span
                className={cn(
                  'block font-display text-hero tabular-nums [unicode-bidi:isolate]',
                  alert ? 'text-error' : 'text-gray-900'
                )}
              >
                {counter.value}
              </span>
              <span className="mt-1 block min-h-[1.125rem] text-caption text-gray-600">{counter.hint ?? ''}</span>
            </span>
          </>
        );
        const frame = cn(
          'flex min-w-0 flex-col justify-between p-6 max-tablet:p-5',
          index % 2 === 0 && 'border-e border-gray-200',
          index < 2 && 'border-b border-gray-200'
        );
        return counter.href ? (
          <Link key={counter.label} href={counter.href} className={cn(frame, 'transition-colors hover:bg-gray-50')}>
            {body}
          </Link>
        ) : (
          <div key={counter.label} className={frame}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

/* ===========================================================================
 * Work that needs you — the dark feature tile
 * ======================================================================== */

interface ChecklistItem {
  id: string;
  title: string;
  meta: string;
  late: boolean;
  done: boolean;
  href?: string;
}

/**
 * Today's agenda and the decisions or tasks waiting on the reader, as one
 * checklist — reference 1's onboarding task card, on `ink`.
 *
 * WHAT "DONE" MEANS, because the check circles must not claim more than the
 * data holds: an agenda entry whose time has passed is done (the meeting
 * happened); a task is done when its state says so. An approval is never
 * shown done here — a decided approval leaves the queue. The circles are
 * indicators, not controls: ticking one would claim a task was completed
 * that nobody completed.
 */
export function WorkChecklist({
  locale,
  agenda,
  approvals = [],
  tasks = [],
}: {
  locale: Locale;
  agenda: AgendaEntry[];
  approvals?: ApprovalRecord[];
  tasks?: TaskRecord[];
}) {
  const t = useTranslations('staffDashboard.checklist');
  const now = tenantNow();

  const due = (row: { daysOverdue: number; dueToday: boolean; dueOn: string }) =>
    row.daysOverdue > 0
      ? t('late', { days: row.daysOverdue })
      : row.dueToday
        ? t('dueToday')
        : t('due', { date: formatCalendarDate(row.dueOn, locale, { year: false }) });

  const fileHref = (ref: string) => `/staff/matters/${ref}`;

  const items: ChecklistItem[] = [
    ...agenda.map((entry) => ({
      id: entry.id,
      title: entry.title[locale],
      meta: entry.at ? formatClockTime(entry.at, locale) : entry.detail[locale],
      late: false,
      done: entry.at !== null && entry.at < now,
      href: entry.engagementRef ? fileHref(entry.engagementRef) : '/staff/calendar',
    })),
    ...approvals.map((row) => ({
      id: row.id,
      title: row.title[locale],
      meta: due(row),
      late: row.daysOverdue > 0,
      done: false,
      href: '/staff/approvals',
    })),
    ...[...tasks]
      .sort((a, b) => Number(b.state === 'done') - Number(a.state === 'done'))
      .map((task) => ({
        id: task.id,
        title: task.title[locale],
        meta: task.state === 'done' ? t('done') : due(task),
        late: task.state !== 'done' && task.daysOverdue > 0,
        done: task.state === 'done',
        href: fileHref(task.engagementRef),
      })),
  ];

  const done = items.filter((item) => item.done).length;

  return (
    <section
      aria-labelledby="work-checklist"
      className={cn(TILE, 'flex h-full flex-col bg-ink p-6 text-on-dark [&_:focus-visible]:outline-on-dark')}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ListChecks aria-hidden size={18} strokeWidth={1.8} className="text-ornament" />
          <h2 id="work-checklist" className="font-sans text-title text-on-dark">
            {t('heading')}
          </h2>
        </div>
        {items.length > 0 ? (
          <p className="text-end">
            <span
              aria-hidden
              dir="ltr"
              className="block font-display text-display font-light tabular-nums text-on-dark"
            >
              {done}/{items.length}
            </span>
            <span className="sr-only">{t('progress', { done, total: items.length })}</span>
          </p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <p className="mt-6 text-body text-white/80">{t('empty')}</p>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col">
          {items.map((item) => {
            const row = (
              <>
                {/* The check circle. Gold fill when done — decoration, the
                    words beside it carry the state for every reader. */}
                <span
                  aria-hidden
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-pill',
                    item.done ? 'bg-ornament text-ink' : 'border border-white/40'
                  )}
                >
                  {item.done ? <Check size={15} strokeWidth={2.5} /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block text-body',
                      item.done ? 'text-white/80 line-through decoration-white/60' : 'text-on-dark'
                    )}
                  >
                    <bdi>{item.title}</bdi>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-caption text-white/80">
                    {item.late ? (
                      <AlertTriangle aria-hidden size={12} strokeWidth={2} className="text-ornament" />
                    ) : (
                      <Clock3 aria-hidden size={12} strokeWidth={2} className="text-white/60" />
                    )}
                    <span className="[unicode-bidi:isolate]">{item.meta}</span>
                  </span>
                </span>
                <span className="sr-only">{item.done ? t('done') : t('open')}</span>
              </>
            );
            return (
              <li key={item.id} className="border-b border-white/10 last:border-b-0">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="-mx-2 flex items-center gap-3 rounded-card px-2 py-3 transition-colors hover:bg-white/5"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ===========================================================================
 * Court week — a week schedule grid
 * ======================================================================== */

/**
 * Colour by event type. Meezan's tokens only, which the dataviz validator
 * marks low-chroma — so identity never rests on colour: every block names its
 * type in words, and a legend sits above the grid. Charcoal, bronze and gold
 * separate at ΔE 16+ under colour-blindness simulation; gold is under 3:1 on
 * white, which is exactly why each block also carries its label.
 */
const KIND_BAR: Record<CourtEventKind, string> = {
  hearing: 'border-action bg-action/10',
  conference: 'border-action bg-action/10',
  submission: 'border-ink bg-ink/10',
  filing: 'border-ornament bg-ornament/15',
};
const KIND_SWATCH: Record<CourtEventKind, string> = {
  hearing: 'bg-action',
  conference: 'bg-action',
  submission: 'bg-ink',
  filing: 'bg-ornament',
};

/**
 * This week on the reader's files, as a grid: working days Sunday to Thursday,
 * Friday and Saturday hatched as the weekend, a dashed line on today, a row
 * per legal matter (per person for a legal secretary), and a block per event.
 *
 * Below tablet width the grid gives way to the hearings list, which reads on
 * a phone where seven columns cannot.
 *
 * NO TIMES. The engagement timeline records the day of a sitting, never the
 * hour, and the grid does not invent one — the court is shown instead.
 */
export function CourtWeekTile({
  week,
  hearings,
  locale,
  byPerson = false,
}: {
  week: CourtWeek;
  hearings: HearingRecord[];
  locale: Locale;
  byPerson?: boolean;
}) {
  const t = useTranslations('staffDashboard.court');
  const todayIndex = week.days.findIndex((day) => day.date === week.today);
  const kindsShown = [...new Set(week.rows.flatMap((row) => row.events.map((event) => event.kind)))];
  const legend = (['hearing', 'conference', 'submission', 'filing'] as CourtEventKind[]).filter((kind) =>
    kindsShown.includes(kind)
  );

  return (
    <>
      <div className="h-full tablet:hidden">
        <HearingsTimeline hearings={hearings} locale={locale} />
      </div>

      <section
        aria-labelledby="court-week"
        className={cn(TILE, 'hidden h-full flex-col border border-gray-200 bg-white p-6 tablet:flex')}
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CalendarRange aria-hidden size={18} strokeWidth={1.8} className="text-gray-600" />
            <div>
              <h2 id="court-week" className="font-sans text-title text-gray-700">
                {t('heading')}
              </h2>
              <p className="text-caption text-gray-600 [unicode-bidi:isolate]">
                {t('caption', {
                  start: formatCalendarDate(week.days[0].date, locale, { year: false }),
                  end: formatCalendarDate(week.days[6].date, locale, { year: false }),
                })}
              </p>
            </div>
          </div>

          {legend.length > 0 ? (
            <ul aria-label={t('legend')} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {legend.map((kind) => (
                <li key={kind} className="flex items-center gap-1.5 text-caption text-gray-700">
                  <span aria-hidden className={cn('h-2.5 w-2.5 rounded-sm', KIND_SWATCH[kind])} />
                  {t(`kinds.${kind}`)}
                </li>
              ))}
            </ul>
          ) : null}
        </header>

        {/* The weekend hatch: one SVG line pattern, flat — not a gradient. */}
        <svg aria-hidden className="absolute h-0 w-0">
          <defs>
            <pattern id="syn-weekend-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" strokeWidth="2" style={{ stroke: 'var(--color-gray-200)' }} />
            </pattern>
          </defs>
        </svg>

        <div
          role="table"
          aria-label={t('heading')}
          className="relative mt-5 grid flex-1 overflow-hidden rounded-card border border-gray-200"
          style={{ gridTemplateColumns: 'minmax(7.5rem, 11rem) repeat(7, minmax(0, 1fr))' }}
        >
          {/* Header row */}
          <div role="row" className="contents">
            <div role="columnheader" className="border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-caption font-medium text-gray-600">
              {byPerson ? t('rowsPeople') : t('rowsMatters')}
            </div>
            {week.days.map((day, index) => (
              <div
                key={day.date}
                role="columnheader"
                className={cn(
                  'border-b border-s border-gray-200 px-1 py-2 text-center',
                  day.weekend ? 'bg-gray-50' : 'bg-white'
                )}
              >
                <span className="block text-caption text-gray-600">{formatWeekday(day.date, locale)}</span>
                <span
                  className={cn(
                    'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-pill font-display text-body tabular-nums [unicode-bidi:isolate]',
                    index === todayIndex ? 'bg-action font-medium text-white' : 'text-gray-900'
                  )}
                >
                  {formatDayOfMonth(day.date, locale)}
                </span>
                {day.weekend ? <span className="sr-only">{t('weekend')}</span> : null}
                {index === todayIndex ? <span className="sr-only">{t('today')}</span> : null}
              </div>
            ))}
          </div>

          {week.rows.length === 0 ? (
            <p role="row" className="col-span-full px-4 py-8 text-center text-body text-gray-600">
              <span role="cell">{t('empty')}</span>
            </p>
          ) : (
            week.rows.map((row) => (
              <div key={row.id} role="row" className="contents">
                <div role="rowheader" className="min-w-0 border-b border-gray-200 px-3 py-3 last:border-b-0">
                  {row.reference ? (
                    <span dir="ltr" className="block font-mono text-reference text-gray-600">
                      {row.reference}
                    </span>
                  ) : null}
                  <span className="line-clamp-2 text-caption font-medium text-gray-700">
                    <bdi>{row.label[locale]}</bdi>
                  </span>
                </div>
                {week.days.map((day, dayIndex) => {
                  const events = row.events.filter((event) => event.date === day.date);
                  return (
                    <div
                      key={day.date}
                      role="cell"
                      className="relative min-h-[4.5rem] min-w-0 border-b border-s border-gray-200 p-1"
                    >
                      {day.weekend ? (
                        <svg aria-hidden className="absolute inset-0 h-full w-full">
                          <rect width="100%" height="100%" fill="url(#syn-weekend-hatch)" />
                        </svg>
                      ) : null}
                      {/* Today: a dashed line down the middle of the column,
                          drawn per cell so it never moves the grid's flow. */}
                      {dayIndex === todayIndex ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 start-1/2 border-s-2 border-dashed border-action"
                        />
                      ) : null}
                      {events.map((event) => (
                        <Link
                          key={event.id}
                          href={event.href}
                          className={cn(
                            'relative mb-1 block rounded-sm border-s-4 px-1.5 py-1 last:mb-0 hover:underline',
                            KIND_BAR[event.kind],
                            event.completed && 'border-dashed'
                          )}
                        >
                          <span className="flex items-center gap-1 text-caption font-medium text-gray-900">
                            {event.completed ? <Check aria-hidden size={11} strokeWidth={2.5} /> : null}
                            <span className="truncate">{t(`kinds.${event.kind}`)}</span>
                          </span>
                          <span className="line-clamp-2 text-caption text-gray-700">
                            <bdi>{event.court[locale]}</bdi>
                          </span>
                          <span className="sr-only">
                            <bdi>{event.title[locale]}</bdi>
                            {event.completed ? ` — ${t('done')}` : ''}
                          </span>
                        </Link>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))
          )}

        </div>
      </section>
    </>
  );
}

/* ===========================================================================
 * Hours — a ring against the month's target, and the weeks as bars
 * ======================================================================== */

/**
 * Recorded hours this month against the month's target, as a meter ring —
 * reference 1's time tracker. Dataviz meter rules: the fill is `action`, the
 * unfilled track a lighter step of the same hue, the number in text at the
 * centre. Over target, the ring closes and the caption says by how much.
 */
export function HoursRingTile({ billing, locale }: { billing: BillingSummary; locale: Locale }) {
  const t = useTranslations('staffDashboard.hours');
  const tb = useTranslations('staffDashboard.billing');

  const target = billing.targetPerWeek * billing.weeks.length;
  const pct = target > 0 ? Math.min(billing.total / target, 1) : 0;
  const R = 52;
  const C = 2 * Math.PI * R;
  const gap = Math.round((billing.total - target) * 10) / 10;

  return (
    <section
      aria-labelledby="hours-ring"
      className={cn(TILE, 'flex h-full flex-col border border-gray-200 bg-white p-6')}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="hours-ring" className="font-sans text-title text-gray-700">
            {t('ringHeading')}
          </h2>
          <p className="text-caption text-gray-600">{t('ringCaption', { target })}</p>
        </div>
      </header>

      <div className="relative mx-auto mt-5 h-44 w-44">
        <svg
          viewBox="0 0 120 120"
          role="img"
          aria-label={t('ringLabel', { hours: billing.total, target, pct: Math.round((billing.total / Math.max(target, 1)) * 100) })}
          className="h-full w-full -rotate-90"
        >
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" opacity="0.15" style={{ stroke: 'var(--color-action)' }} />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${pct * C} ${C}`}
            style={{ stroke: 'var(--color-action)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-hero tabular-nums text-gray-900 [unicode-bidi:isolate]">
            {billing.total}
          </span>
          <span className="mt-1 text-caption text-gray-600">{t('unit')}</span>
        </div>
      </div>

      <p className="mt-4 text-center text-caption font-medium text-gray-700 [unicode-bidi:isolate]">
        {gap >= 0 ? t('over', { hours: gap }) : t('remaining', { hours: -gap })}
      </p>
      <p className="mt-2 text-caption text-gray-600">{tb('notLive')}</p>
      <div className="mt-4">
          <LogTimeModal
            engagements={billing.engagements.map((row) => ({ value: row.value, label: row.label[locale] }))}
            today={billing.today}
            weeksShown={billing.weeksShown}
          />
      </div>
      {billing.loggedThisSession.entries > 0 ? (
        <p className="mt-1 text-caption text-gray-600">
          {tb('loggedThisSession', {
            entries: billing.loggedThisSession.entries,
            hours: Math.floor(billing.loggedThisSession.minutes / 60),
            minutes: billing.loggedThisSession.minutes % 60,
          })}
        </p>
      ) : null}
    </section>
  );
}

/** The weeks as columns, this week highlighted — the stat-tile trend rule. */
export function HoursBarsTile({ billing }: { billing: BillingSummary }) {
  const t = useTranslations('staffDashboard.hours');
  const thisWeek = billing.weeks[billing.weeks.length - 1] ?? 0;

  return (
    <section
      aria-labelledby="hours-bars"
      className={cn(TILE, 'flex h-full flex-col border border-gray-200 bg-white p-6')}
    >
      <header className="flex items-end justify-between gap-3">
        <div>
          <h2 id="hours-bars" className="font-sans text-title text-gray-700">
            {t('barsHeading')}
          </h2>
          <p className="text-caption text-gray-600">{t('barsCaption')}</p>
        </div>
        <p className="text-end">
          <span className="font-display text-hero tabular-nums text-gray-900 [unicode-bidi:isolate]">
            {thisWeek}
          </span>
          <span className="ms-1 text-caption text-gray-600">{t('unit')}</span>
        </p>
      </header>
      <div className="mt-auto">
        <HoursChart weeks={billing.weeks} target={billing.targetPerWeek} highlightLast />
      </div>
    </section>
  );
}
