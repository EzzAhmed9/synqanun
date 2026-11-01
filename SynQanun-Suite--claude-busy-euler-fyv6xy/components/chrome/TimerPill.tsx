'use client';

import { Pause, Play, Square } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDuration, useUIState } from '@/components/providers/UIStateProvider';
import { cn } from '@/lib/utils';

export interface TimerPillProps {
  /** Matter reference the timer opens against when started from this screen. */
  matterRef?: string;
  /** Hide on screens where time recording makes no sense — the client portal,
   *  auth screens. */
  hidden?: boolean;
  /**
   * Ride above the assistant's floating launcher.
   *
   * False on the screens that have no launcher, where reserving its height
   * would float the pill 68px up the page for nothing. The caller decides,
   * because the caller is the one that knows the route — see
   * components/mueen/launcher-visibility.ts.
   */
  stacked?: boolean;
  className?: string;
}

/**
 * Floating billable-hours timer.
 *
 * Fixed to the BOTTOM-END corner: bottom-right in English, bottom-left in
 * Arabic. That mirroring is done with `insetInlineEnd`, the logical equivalent
 * of `right`, rather than a `left`/`right` pair swapped by an RTL check —
 * design.md §12: "Use CSS logical properties (margin-inline-start, not
 * margin-left) throughout — hard left/right values will break on locale
 * switch."
 *
 * The pill floats above the page, so design.md §6 puts it at elevation level 1
 * (`0 1px 3px rgba(19,19,22,0.08)`). Level 2 is reserved for modals and the
 * floating AI chat panel; a persistent element at overlay weight would make
 * the whole screen feel heavier than the "calm authority" theme allows.
 *
 * Colour: syn-red for the start control. Recording billable time is the
 * lawyer's own action, not the agent's — design.md §2's human/AI split puts it
 * firmly on the red side.
 *
 * The duration is set in JetBrains Mono so the digits are tabular and the pill
 * does not jitter as the seconds tick (design.md §3 assigns mono to exactly
 * this kind of reference figure), and it uses Western numerals in both
 * languages per design.md §12.
 */
export function TimerPill({ matterRef, hidden = false, stacked = true, className }: TimerPillProps) {
  const t = useTranslations('timer');
  const { timer, startTimer, pauseTimer, stopTimer } = useUIState();

  if (hidden) return null;

  const isRunning = timer.running;
  const hasTime = timer.elapsedSeconds > 0;

  return (
    <div
      role="region"
      aria-label={t('label')}
      className={cn(
        'fixed z-40 flex items-center gap-2',
        /*
          BELOW 768px IT RIDES ABOVE THE TAB BAR. A plain `bottom-6` put it
          exactly where design.md §8's bottom tab bar sits — the one real
          collision in that whole piece of chrome, and a running timer would
          have covered two of the five tabs on the screen size with the least
          room to spare. Above 768px the bar is not rendered, so only the
          offset below applies there.
        */
        /*
          AND IT RIDES ABOVE THE ASSISTANT'S LAUNCHER, wherever there is one.
          The launcher keeps the corner — it is on nearly every staff screen,
          while the timer is on four ranks out of five, so the thing that is
          more often there is the thing that does not move.
          `--syn-launcher-size` is read rather than copied, so a resize of the
          button cannot leave the two overlapping.

          `stacked` is false on the two screens the launcher stands down on,
          where reserving its height would push the pill up the page for
          nothing. See components/mueen/launcher-visibility.ts, which both
          components ask.
        */
        stacked
          ? [
              'max-tablet:bottom-[calc(var(--syn-tab-bar-height)+env(safe-area-inset-bottom)+0.75rem+var(--syn-launcher-size)+0.75rem)]',
              'tablet:bottom-[calc(1.5rem+var(--syn-launcher-size)+0.75rem)]',
            ]
          : [
              'max-tablet:bottom-[calc(var(--syn-tab-bar-height)+env(safe-area-inset-bottom)+0.75rem)]',
              'tablet:bottom-6',
            ],
        'rounded-pill border border-gray-200 bg-white ps-4 pe-2 py-2',
        'shadow-raised',
        className
      )}
      // Logical inset: the end side is right in LTR and left in RTL, so the
      // pill flips corners with the interface language.
      style={{ insetInlineEnd: '1.5rem' }}
    >
      <div className="flex flex-col">
        <span className="text-caption leading-none text-gray-500">{t('label')}</span>
        <span className="font-mono text-reference font-medium tabular-nums text-gray-700">
          {formatDuration(timer.elapsedSeconds)}
        </span>
      </div>

      {/* Status is carried by an icon + text label, never by colour alone —
          brand-guidelines.md §3.5. */}
      <span className="sr-only">{isRunning ? t('running') : t('paused')}</span>

      {isRunning ? (
        <button
          type="button"
          onClick={pauseTimer}
          aria-label={t('pause')}
          title={t('pause')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-gray-600 hover:bg-gray-100"
        >
          <Pause aria-hidden size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => startTimer(matterRef)}
          aria-label={t('start')}
          title={t('start')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-pill bg-action text-white hover:bg-action-pressed"
        >
          <Play aria-hidden size={16} />
        </button>
      )}

      {/*
        "Stop timer", NOT "stop and log time". It used to say the latter, which
        was survivable while nothing in the product logged time and became a
        false statement the moment something did: `stopTimer` discards the
        elapsed seconds (UIStateProvider), so a reader who pressed this
        believing it recorded their afternoon would lose it. Logging is the
        dialog on the hours card and on every engagement record.
      */}
      <button
        type="button"
        onClick={stopTimer}
        disabled={!hasTime}
        aria-label={t('stop')}
        title={t('stop')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-transparent"
      >
        <Square aria-hidden size={14} />
      </button>
    </div>
  );
}

export default TimerPill;
