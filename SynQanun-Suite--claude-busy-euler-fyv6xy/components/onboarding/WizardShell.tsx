'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@/components/ui';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  ONBOARDING_STEPS,
  nextStep,
  previousStep,
  stepIndex,
  stepNumber,
  stepProgress,
  type StepId,
} from './steps';

export interface WizardShellProps {
  step: StepId;
  /** Step heading — display scale, one per screen (design.md §3). */
  title: string;
  children: React.ReactNode;
  /**
   * Replaces the default "Continue" button on the final step. The footer shape
   * stays identical across all five so the controls do not move under the
   * user's cursor between steps.
   */
  primaryAction?: React.ReactNode;
  /** Called before advancing. Return false to block navigation. */
  onBeforeNext?: () => boolean;
}

/**
 * Chrome shared by all five onboarding steps: the progress bar, the stepper
 * strip, the step heading, and the persistent Back / Continue / Save-later
 * footer.
 *
 * Every measurement here is logical — `ps-`/`pe-`, `text-start`,
 * `justify-between`, `insetInlineStart` — so the whole wizard mirrors in
 * Arabic without a second code path. The one thing that must NOT mirror is the
 * step order itself: step 1 stays first in the DOM, and RTL flows it to the
 * right automatically.
 */
export function WizardShell({
  step,
  title,
  children,
  primaryAction,
  onBeforeNext,
}: WizardShellProps) {
  const t = useTranslations('onboarding');
  const tSteps = useTranslations('onboarding.steps');
  const router = useRouter();

  const index = stepIndex(step);
  const prev = previousStep(step);
  const next = nextStep(step);

  function handleNext() {
    if (onBeforeNext && !onBeforeNext()) return;
    if (next) router.push(next.href);
  }

  return (
    <main className="mx-auto w-full max-w-content flex-1 px-6 py-8">
      {/* --- Progress --------------------------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {/* Sentence case, not the export's tracked all-caps eyebrow —
              design.md §3 and §7 forbid those by name. Western digits (§12). */}
          <p className="text-caption font-medium text-action">
            {t('stepCounter', { current: stepNumber(step), total: ONBOARDING_STEPS.length })}
          </p>
          <h1 className="mt-1 font-display text-display text-gray-700">{title}</h1>
        </div>
        <p className="font-mono text-caption text-gray-500">
          {t('percentComplete', { percent: stepProgress(step) })}
        </p>
      </div>

      {/* The bar fills from the inline-start edge, so it grows left-to-right
          in English and right-to-left in Arabic. */}
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-gray-200"
        role="progressbar"
        aria-valuenow={stepProgress(step)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('progressLabel')}
      >
        <div
          className="h-full rounded-pill bg-action transition-[width] duration-300"
          style={{ width: `${stepProgress(step)}%` }}
        />
      </div>

      {/* --- Stepper strip ---------------------------------------------- */}
      <ol className="mt-6 grid grid-cols-2 gap-2 tablet:grid-cols-3 desktop:grid-cols-5">
        {ONBOARDING_STEPS.map((s, i) => {
          const isCurrent = i === index;
          const isDone = i < index;

          return (
            <li key={s.id}>
              {/* Completed steps are reachable; future ones are not, so the
                  wizard cannot be skipped forward past required input. */}
              <StepChip
                href={isDone ? s.href : undefined}
                number={i + 1}
                label={tSteps(`${s.id}.label`)}
                caption={
                  isCurrent
                    ? t('inProgress')
                    : isDone
                      ? t('completed')
                      : tSteps(`${s.id}.caption`)
                }
                state={isCurrent ? 'current' : isDone ? 'done' : 'upcoming'}
              />
            </li>
          );
        })}
      </ol>

      {/* --- Step body --------------------------------------------------- */}
      <div className="mt-8">{children}</div>

      {/* --- Persistent footer ------------------------------------------- */}
      <Card padding="sm" className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            disabled={!prev}
            onClick={() => prev && router.push(prev.href)}
          >
            {t('back')}
          </Button>

          {/* MOCK: there is nowhere to save to in Track A. Track A.5 persists
              the partial tenant record so the wizard can be resumed. */}
          <button
            type="button"
            className="text-caption font-medium text-gray-500 underline hover:text-gray-700"
          >
            {t('saveAndFinishLater')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          {next ? (
            <span className="hidden text-caption text-gray-500 tablet:inline">
              {t('nextUp', { step: tSteps(`${next.id}.label`) })}
            </span>
          ) : null}
          {primaryAction ?? (
            <Button variant="primary" onClick={handleNext}>
              {t('continue')}
            </Button>
          )}
        </div>
      </Card>
    </main>
  );
}

function StepChip({
  href,
  number,
  label,
  caption,
  state,
}: {
  href?: string;
  number: number;
  label: string;
  caption: string;
  state: 'current' | 'done' | 'upcoming';
}) {
  const body = (
    <span
      className={cn(
        'flex h-full items-center gap-3 rounded-card border bg-white p-3',
        state === 'current' ? 'border-action' : 'border-gray-200',
        href && 'hover:bg-gray-50'
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-pill font-mono text-caption font-medium',
          state === 'current' && 'bg-action text-white',
          state === 'done' && 'bg-success text-white',
          state === 'upcoming' && 'bg-gray-100 text-gray-500'
        )}
      >
        {/* A completed step shows a tick AND keeps its number in the
            accessible name — colour alone never carries state
            (brand-guidelines.md §3.5). */}
        {state === 'done' ? <Check aria-hidden size={14} strokeWidth={2.5} /> : number}
      </span>
      <span className="min-w-0 text-start">
        <span
          className={cn(
            'block truncate text-caption font-medium',
            state === 'upcoming' ? 'text-gray-500' : 'text-gray-700'
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'block truncate text-caption',
            state === 'current' ? 'text-action' : 'text-gray-500'
          )}
        >
          {caption}
        </span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }

  return (
    <span aria-current={state === 'current' ? 'step' : undefined} className="block h-full">
      {body}
    </span>
  );
}

export default WizardShell;
