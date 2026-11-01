/**
 * The wizard's five steps, in order.
 *
 * One list drives the stepper strip, the progress bar, and each footer's
 * Back/Continue targets. Three copies of the order would eventually disagree,
 * and a wizard whose progress bar and navigation disagree is worse than one
 * with neither.
 *
 * Labels and captions are keys into the `onboarding.steps` namespace, so a
 * step cannot be added without both languages having text for it.
 */
export const ONBOARDING_STEPS = [
  { id: 'branding', href: '/onboarding/branding' },
  { id: 'team', href: '/onboarding/team' },
  { id: 'integrations', href: '/onboarding/integrations' },
  { id: 'billing', href: '/onboarding/billing' },
  { id: 'review', href: '/onboarding/review' },
] as const;

export type StepId = (typeof ONBOARDING_STEPS)[number]['id'];

export function stepIndex(id: StepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id);
}

/** 1-based position, for "Step N of 5". Western digits in both locales (§12). */
export function stepNumber(id: StepId): number {
  return stepIndex(id) + 1;
}

export function previousStep(id: StepId) {
  const i = stepIndex(id);
  return i > 0 ? ONBOARDING_STEPS[i - 1] : null;
}

export function nextStep(id: StepId) {
  const i = stepIndex(id);
  return i < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[i + 1] : null;
}

/** Completion percentage shown beside the progress bar. */
export function stepProgress(id: StepId): number {
  return Math.round((stepNumber(id) / ONBOARDING_STEPS.length) * 100);
}
