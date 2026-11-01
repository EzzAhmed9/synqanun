import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export interface HoursChartProps {
  /** Hours per week, oldest first. */
  weeks: number[];
  /** The weekly target the bars are measured against. */
  target: number;
  /**
   * Accent only the latest week; earlier weeks take a lighter step of the
   * same hue — the dataviz stat-tile trend rule (current period in the
   * accent). Each column still names its week and hours on hover and focus,
   * and the table below states every value.
   */
  highlightLast?: boolean;
}

/**
 * Recorded hours per week, with the target marked.
 *
 * DIVS, NOT A CHART LIBRARY. Four bars and a threshold line do not justify a
 * dependency, and a charting package would bring its own colour scale straight
 * through design.md §2 — which is exactly how a product ends up with a fifth
 * accent nobody chose.
 *
 * THE BARS ARE NOT THE CONTENT
 * ---------------------------------------------------------------------------
 * The export renders bars with the figures baked into their labels and nothing
 * else — so a screen reader gets "W1 (38h)" from a caption and the shape itself
 * is meaningless to it, while the heights carry the comparison for everyone
 * else. Here the same numbers are a real table underneath: a <dl> that states
 * each week and its hours, so the data is readable either way and the visual
 * is an aid rather than the only copy of it. Each column also names its own
 * week and hours, for hover, focus and assistive tech.
 */
/*
 * REBUILT TO THE DATAVIZ RULES (Phase 4)
 * ---------------------------------------------------------------------------
 *  · ONE SERIES, ONE HUE. Every bar is `action`. The old chart painted bars at
 *    or over target syn-red and the rest legal-navy at 70%, which put the
 *    AI's colour on a human's hours (design.md §2) and made colour the only
 *    carrier of above/below. The target line and the figures underneath
 *    carry that now; a single series needs no legend.
 *  · MARKS. Columns at most 24px wide, a 4px rounded data-end, square at a
 *    hairline baseline. The target is a solid 1px `ink` rule, not a dashed
 *    one, labelled in text above the plot.
 *  · HOVER AND FOCUS. Each column is focusable and shows its week and hours
 *    on hover or focus, so the value is never only a height.
 *  · THE TABLE STAYS. The <dl> below is the table view, in Western digits.
 */
export function HoursChart({ weeks, target, highlightLast = false }: HoursChartProps) {
  const t = useTranslations('staffDashboard.billing');
  const tChart = useTranslations('staffDashboard.chart');

  // Scale to the tallest bar OR the target, whichever is higher, so the
  // threshold line is always on the chart rather than clipped off the top.
  const ceiling = Math.max(...weeks, target, 1);

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3 text-caption text-gray-600">
        <span>{t('weekly')}</span>
        <span className="flex items-center gap-1.5 [unicode-bidi:isolate]">
          <span aria-hidden className="inline-block h-px w-4 bg-ink" />
          {t('target', { hours: target })}
        </span>
      </div>

      <div
        role="group"
        aria-label={tChart('label')}
        className="relative mt-3 flex h-28 items-end gap-2 border-b border-gray-200"
      >
        {/* Threshold, positioned by the same scale as the columns. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 border-t border-ink"
          style={{ bottom: `${(target / ceiling) * 100}%` }}
        />

        {weeks.map((hours, index) => {
          const label = tChart('bar', { number: index + 1, hours });
          return (
            <div key={index} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                tabIndex={0}
                role="img"
                aria-label={label}
                className={cn(
                  'relative w-full max-w-6 rounded-t-sm outline-offset-2',
                  highlightLast && index < weeks.length - 1 ? 'bg-action/35' : 'bg-action'
                )}
                style={{ height: `${(hours / ceiling) * 100}%` }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-full start-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-gray-900 px-1.5 py-0.5 text-caption text-white group-hover:block group-focus-within:block rtl:translate-x-1/2"
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* The table view. Western digits in both languages — design.md §12 —
          and mono so the columns align. */}
      <dl className="mt-2 flex gap-2">
        {weeks.map((hours, index) => (
          <div key={index} className="flex-1 text-center">
            <dt className="text-caption text-gray-600">{t('week', { number: index + 1 })}</dt>
            <dd
              className={cn(
                'font-mono text-reference tabular-nums [unicode-bidi:isolate]',
                hours >= target ? 'font-medium text-gray-900' : 'text-gray-600'
              )}
            >
              {t('hoursShort', { hours })}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default HoursChart;
