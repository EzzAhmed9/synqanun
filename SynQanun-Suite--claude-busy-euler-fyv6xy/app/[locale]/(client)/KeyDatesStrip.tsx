import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Card } from '@/components/ui';
import { formatCalendarDate } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import type { KeyDate } from '@/lib/mock-api';
import { cn } from '@/lib/utils';

export interface KeyDatesStripProps {
  dates: KeyDate[];
  locale: Locale;
  /**
   * `strip` scrolls horizontally — the dashboard, where key dates are one band
   * among several sections. `grid` wraps into rows — a matter's timeline, where
   * the dates are the whole point of the panel and hiding half of them behind a
   * sideways scroll would be perverse.
   *
   * The CARD is identical either way. Only the container differs.
   */
  layout?: 'strip' | 'grid';
  /** Heading above the strip. Omit when the surrounding panel already has one. */
  heading?: string;
  /** Caption at the end of the heading row — a count, usually. */
  caption?: string;
  /** Shown instead of the cards when `dates` is empty. */
  emptyLabel?: string;
  /** Labels the `matter` / `project` source badge. Omit to hide it. */
  showKindBadge?: boolean;
}

/**
 * Hearings, filings and deadlines as a row of cards.
 *
 * Built for the Client Dashboard, then made shared when the matter detail
 * needed the same thing for its timeline — the second real instance, which is
 * the threshold on this project for extracting anything.
 *
 * THE DATES — this is the screen element that got RTL wrong once
 * ---------------------------------------------------------------------------
 * The first build forced `dir="ltr"` on the date, reasoning that Western digits
 * want a left-to-right run. Measured in the browser, "20 سبتمبر 2026" rendered
 * as "20 2026 سبتمبر" — day, year, month — in every card. A formatted date in
 * Arabic contains an Arabic month name, and its correct visual order IS the
 * right-to-left one.
 *
 * So: isolate, never direct. `dir="ltr"` is for identifiers that are Latin in
 * every locale — MAT-2201, INV-2026-089 — and the source reference at the foot
 * of each card is the only thing here that qualifies. The rule is written out
 * in full in lib/format.ts.
 *
 * Everything is formatted on the server through `formatCalendarDate`, which
 * pins the timezone, so there is no second render in the browser's zone to
 * disagree with the first.
 */
export function KeyDatesStrip({
  dates,
  locale,
  layout = 'strip',
  heading,
  caption,
  emptyLabel,
  showKindBadge = true,
}: KeyDatesStripProps) {
  const t = useTranslations('dashboard.keyDates');

  if (dates.length === 0 && emptyLabel) {
    return (
      <section className="flex flex-col gap-2">
        {heading ? <Header heading={heading} caption={caption} /> : null}
        <Card surface="muted" padding="sm">
          <p className="text-caption text-gray-500">{emptyLabel}</p>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      {heading ? <Header heading={heading} caption={caption} /> : null}

      {/*
        Nothing here is written in terms of left or right. In Arabic the strip
        starts at the right and scrolls the other way from `dir` alone.
      */}
      <ul
        className={cn(
          layout === 'strip'
            ? 'flex gap-3 overflow-x-auto pb-1'
            : 'grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-4'
        )}
      >
        {dates.map((entry) => (
          <li key={entry.id} className={layout === 'strip' ? 'shrink-0' : undefined}>
            <Card
              padding="sm"
              className={cn(
                'flex h-full flex-col gap-2',
                layout === 'strip' && 'w-60',
                // A finished step recedes. Not greyed-out text — the record has
                // to stay readable — just a muted surface.
                entry.completed && 'bg-gray-50'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Isolated, NOT forced to ltr. See the file header. */}
                <time
                  dateTime={entry.date}
                  className={cn(
                    'text-body-emphasis [unicode-bidi:isolate]',
                    entry.completed ? 'text-gray-500' : 'text-gray-900'
                  )}
                >
                  {formatCalendarDate(entry.date, locale)}
                </time>

                {entry.completed ? (
                  <Badge
                    tone="success"
                    icon={<Check aria-hidden size={13} strokeWidth={2.25} />}
                  >
                    {t('completed')}
                  </Badge>
                ) : showKindBadge ? (
                  <Badge tone="neutral">
                    {entry.kind === 'matter' ? t('matter') : t('project')}
                  </Badge>
                ) : null}
              </div>

              <div className="min-w-0">
                <p className={cn('text-body', entry.completed ? 'text-gray-600' : 'text-gray-700')}>
                  {entry.title[locale]}
                </p>
                <p className="text-caption text-gray-500">{entry.detail[locale]}</p>
              </div>

              {entry.note ? (
                <p
                  className={cn(
                    'mt-auto border-t border-gray-200 pt-2 text-caption',
                    // A line the CLIENT has to act on is warning-toned with an
                    // icon and a label — design.md §2 forbids colour alone, and
                    // syn-red is reserved for the human's own controls, not for
                    // alarm. Anything else is a status the firm is reporting.
                    entry.awaitingClient ? 'text-warning-text' : 'text-gray-500'
                  )}
                >
                  {entry.awaitingClient ? (
                    <Badge tone="warning">{entry.note[locale]}</Badge>
                  ) : (
                    entry.note[locale]
                  )}
                </p>
              ) : null}

              {/* A Latin identifier in both locales — this is what `dir="ltr"`
                  is actually for. */}
              <p
                dir="ltr"
                className="mt-auto font-mono text-reference text-gray-500 [unicode-bidi:isolate]"
              >
                {entry.sourceRef}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Header({ heading, caption }: { heading: string; caption?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      {/* Sentence case, no tracked-out caps — design.md §3 and §7 name the
          all-caps eyebrow as a generic-AI-UI tell. */}
      <h2 className="text-body-emphasis text-gray-700">{heading}</h2>
      {caption ? <p className="text-caption text-gray-500">{caption}</p> : null}
    </div>
  );
}

export default KeyDatesStrip;
