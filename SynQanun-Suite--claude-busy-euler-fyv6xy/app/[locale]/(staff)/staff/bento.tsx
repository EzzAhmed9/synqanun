import Image from 'next/image';
import { ArrowRight, CalendarDays, Gavel, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { buttonClasses, Card } from '@/components/ui';
import {
  formatCalendarDate,
  formatDayOfMonth,
  formatRelativeDays,
  formatWeekday,
  intlLocale,
  tenantNow,
  tenantToday,
} from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { HEARINGS_WINDOW_DAYS, type HearingRecord } from '@/lib/mock-api';
import { recordedMueen } from '@/lib/mueen/avatar';
import { cn } from '@/lib/utils';
import { CardHead } from './cards';
import { MueenPrompt } from './MueenPrompt';

/**
 * The staff home's bento grid, and the three tiles only the grid uses: the
 * stat tiles, the معين greeting and the hearings timeline.
 *
 * ===========================================================================
 * THE GRID
 * ===========================================================================
 * Twelve columns on desktop (design.md §5), six on tablet, one on a phone.
 * Tiles take the themed tile radius — `--syn-tile-radius`, which design.md
 * §10.2 grants to the dashboard's tiles and nothing else — and sit flat on
 * the canvas: a border, no shadow, no gradient. In accent mode the same
 * variable falls back to 12px, so an unthemed tenant gets a quieter version
 * of the same arrangement.
 *
 * Every rank's dashboard composes the same pieces in the same order of
 * importance: what the assistant can tell you about today, then the numbers
 * that need you, then the work itself.
 */

/** Spans, written out in full so Tailwind can see every class. */
const SPAN = {
  3: 'tablet:col-span-3 desktop:col-span-3',
  4: 'tablet:col-span-6 desktop:col-span-4',
  5: 'tablet:col-span-6 desktop:col-span-5',
  6: 'tablet:col-span-6 desktop:col-span-6',
  7: 'tablet:col-span-6 desktop:col-span-7',
  8: 'tablet:col-span-6 desktop:col-span-8',
  12: 'tablet:col-span-6 desktop:col-span-12',
} as const;

export type BentoSpan = keyof typeof SPAN;

/** Applied to a card to make it a tile: the themed radius, and full row height. */
export const TILE = 'h-full rounded-[var(--syn-tile-radius)]';

/** "Monday, 05 October 2026" in the tenant's calendar — the top bar's subtitle. */
export function todayLine(locale: Locale): string {
  const today = tenantToday();
  const comma = locale === 'ar' ? '، ' : ', ';
  return `${formatWeekday(today, locale, 'long')}${comma}${formatCalendarDate(today, locale, { month: 'long' })}`;
}

export function Bento({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 tablet:grid-cols-6 tablet:gap-6 desktop:grid-cols-12">{children}</div>
  );
}

export function BentoCell({
  span,
  tall = false,
  tabletHalf = false,
  children,
}: {
  span: BentoSpan;
  /** Two rows high on desktop — the grid's one tall tile. */
  tall?: boolean;
  /**
   * Half the six tablet columns, whatever `span` says. For the tile that
   * shares a tablet row with a span-3 neighbour (the hours bars beside the
   * hours ring), which would otherwise leave three empty columns beside it.
   */
  tabletHalf?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'min-w-0',
        SPAN[span],
        tabletHalf && 'tablet:col-span-3',
        tall && 'desktop:row-span-2'
      )}
    >
      {children}
    </div>
  );
}

/* ===========================================================================
 * The معين greeting
 * ======================================================================== */

export type MueenFact =
  | 'hearingsToday'
  | 'agendaToday'
  | 'decisions'
  | 'overdue'
  | 'tasksDue'
  | 'unread';

/**
 * The assistant's greeting: time of day, today in one sentence, and the way
 * into the Digest.
 *
 * AN AI SURFACE, SO IT LOOKS LIKE ONE (design.md §2, brand-guidelines §7.4):
 * legal-navy wash, the feather, navy actions. No syn-red and no tenant
 * `action` colour anywhere on it — the human/AI split survives theming, and
 * this is the one tile on the page that speaks as the machine.
 *
 * What it says is COUNTED, not generated: the facts come from the same
 * collections as the tiles around it, and a line under them says so. The
 * assistant is معين in Arabic and "Mueen" in English — one name, transliterated
 * rather than translated, in every string on both sides.
 *
 * The greeting follows the tenant's clock (Asia/Riyadh), not the server's or
 * the browser's: the page is rendered per request, and "good morning" at a
 * Riyadh desk is what it should say.
 */
export function MueenTile({
  name,
  facts,
  locale,
  matterRef = null,
}: {
  name: string;
  facts: { key: MueenFact; count: number }[];
  locale: Locale;
  /** A legal matter to offer as a suggestion chip — the reader's next hearing's. */
  matterRef?: string | null;
}) {
  const t = useTranslations('staffDashboard.mueen');

  const hour = Number(tenantNow().slice(0, 2));
  const part = hour >= 4 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening';

  const said = facts.filter((fact) => fact.count > 0);
  const summary =
    said.length === 0
      ? t('nothing')
      : `${t('lead')} ${new Intl.ListFormat(locale, { type: 'conjunction' }).format(
          said.map((fact) => t(`facts.${fact.key}`, { count: fact.count }))
        )}.`;

  return (
    <section
      aria-labelledby="mueen-greeting"
      className={cn(TILE, 'flex h-full flex-col border border-legal-navy/15 bg-legal-navy/5 p-7 max-tablet:p-5')}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/*
            معين's own face, not the feather. The feather is the PRODUCT's AI
            mark and still belongs on every other AI surface; this tile is the
            one place that names a particular assistant, and the avatar is the
            same still the floating launcher shows — one file, so the two
            cannot drift. Decorative: the name is written beside it.
          */}
          <span className="h-10 w-10 shrink-0 overflow-hidden rounded-pill border border-legal-navy/20 bg-white">
            <Image
              src={recordedMueen.face.small}
              alt=""
              width={recordedMueen.face.smallSize}
              height={recordedMueen.face.smallSize}
              unoptimized
              className="h-full w-full object-cover"
            />
          </span>
          <span className="text-body font-medium text-legal-navy">{t('name')}</span>
        </div>
        <Link
          href="/staff/ai/digest"
          className="inline-flex items-center gap-1.5 text-caption font-medium text-legal-navy hover:underline"
        >
          {t('digest')}
          <ArrowRight aria-hidden size={14} className="rtl:rotate-180" />
        </Link>
      </div>

      <h2 id="mueen-greeting" className="mt-6 font-display text-display text-legal-navy">
        {t(`greeting.${part}`, { name })}
      </h2>
      <p className="mt-2 max-w-[44rem] text-body text-gray-700">{summary}</p>
      <p className="mt-1 text-caption text-gray-600">{t('provenance')}</p>

      <div className="mt-auto">
        <MueenPrompt matterRef={matterRef} />
      </div>
    </section>
  );
}

/**
 * The place line, minus the court it repeats. Fixtures write "DIFC Court of
 * First Instance, hearing room 3" beside a court of "DIFC Court of First
 * Instance"; the tile shows the court once and then "Hearing room 3". Null
 * when the place adds nothing.
 */
function placeBeyondCourt(hearing: HearingRecord, locale: Locale): string | null {
  const court = hearing.court[locale];
  const place = hearing.place[locale];
  if (place === court) return null;
  if (!place.startsWith(court)) return place;
  const rest = place.slice(court.length).replace(/^[،,\s]+/, '');
  if (!rest) return null;
  return locale === 'en' ? rest.charAt(0).toUpperCase() + rest.slice(1) : rest;
}

/** "Nov" / "نوفمبر" — the month under a timeline date, in the tenant's calendar. */
function formatMonthShort(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T12:00:00Z`)
  );
}

/* ===========================================================================
 * Hearings timeline
 * ======================================================================== */

/**
 * Upcoming hearings on the reader's files, in date order: date, court, and
 * the legal matter. A dashboard widget only — there is no hearings screen and
 * this does not stand in for one; each row opens the file it belongs to, and
 * the footer opens the calendar, which already shows every sitting.
 *
 * The rail is a hairline in gray-200 and each sitting a dot in `action`
 * (3:1 or better on white in both modes). The date is set in text, never
 * carried by the dot.
 */
export function HearingsTimeline({ hearings, locale }: { hearings: HearingRecord[]; locale: Locale }) {
  const t = useTranslations('staffDashboard.hearings');
  const days = HEARINGS_WINDOW_DAYS;

  return (
    <Card padding="none" className={cn(TILE, 'flex flex-col overflow-hidden')}>
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={Gavel}
          heading={t('heading')}
          caption={t('caption', { count: hearings.length, days })}
        />
      </header>

      {hearings.length === 0 ? (
        <p className="p-5 text-body text-gray-600">{t('empty', { days })}</p>
      ) : (
        <ol className="flex-1 px-5 py-4">
          {hearings.map((hearing, index) => (
            <li key={hearing.id} className="flex gap-3">
              {/* The date, as text. */}
              <div className="w-12 shrink-0 pt-0.5 text-center">
                <span className="block text-caption text-gray-600">
                  {formatWeekday(hearing.date, locale)}
                </span>
                <span className="block font-display text-heading tabular-nums text-gray-900 [unicode-bidi:isolate]">
                  {formatDayOfMonth(hearing.date, locale)}
                </span>
                {/* The month, so a sitting in the next month never reads as
                    out of order beside this month's. */}
                <span className="block text-caption text-gray-600">
                  {formatMonthShort(hearing.date, locale)}
                </span>
              </div>

              {/* The rail. Logical `start`, so it sits correctly in both directions. */}
              <div aria-hidden className="relative flex w-3 shrink-0 justify-center">
                <span
                  className={cn(
                    'absolute w-px bg-gray-200',
                    index === 0 ? 'top-2' : 'top-0',
                    index === hearings.length - 1 ? 'h-2' : 'bottom-0'
                  )}
                />
                <span className="relative mt-1.5 h-2.5 w-2.5 rounded-pill bg-action ring-2 ring-white" />
              </div>

              <div className={cn('min-w-0 flex-1', index < hearings.length - 1 && 'pb-5')}>
                <p className="text-body font-medium text-gray-700">
                  <bdi>{hearing.title[locale]}</bdi>
                </p>
                <p className="mt-0.5 text-caption text-gray-700">
                  <bdi>{hearing.court[locale]}</bdi>
                </p>
                {placeBeyondCourt(hearing, locale) ? (
                  <p className="text-caption text-gray-600">
                    <bdi>{placeBeyondCourt(hearing, locale)}</bdi>
                  </p>
                ) : null}
                <p className="mt-1.5 text-caption">
                  <Link href={hearing.href} className="text-legal-navy hover:underline">
                    <span dir="ltr" className="font-mono text-reference">
                      {hearing.reference}
                    </span>{' '}
                    <bdi>{hearing.engagementTitle[locale]}</bdi>
                  </Link>
                </p>
                <p className="mt-0.5 text-caption text-gray-600 [unicode-bidi:isolate]">
                  {formatCalendarDate(hearing.date, locale, { year: false })} —{' '}
                  {formatRelativeDays(hearing.date, locale)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="border-t border-gray-200 p-4">
        <Link
          href="/staff/calendar"
          className="inline-flex items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          <CalendarDays aria-hidden size={14} />
          {t('calendar')}
        </Link>
      </div>
    </Card>
  );
}
