'use client';

import { AlertTriangle, Check, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Score a password 0–4.
 *
 * Deliberately simple and transparent rather than an entropy estimate: this is
 * guidance shown while typing, and the export's own hint states the rule it
 * checks ("at least 10 characters, including letters, numbers, and a symbol").
 * A meter that disagrees with its stated rule is worse than no meter.
 *
 * SECURITY NOTE: this is UI guidance and nothing more. Password policy must be
 * enforced server-side — see the MOCK on mockApi.invites.accept(). A
 * client-side check is trivially bypassed and is never a control.
 */
export function scorePassword(password: string): StrengthLevel {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return Math.min(score, 4) as StrengthLevel;
}

const LEVEL_META: Record<
  Exclude<StrengthLevel, 0>,
  { key: 'weak' | 'fair' | 'good' | 'strong'; bar: string; text: string; Icon: typeof Check }
> = {
  1: { key: 'weak', bar: 'bg-error', text: 'text-error', Icon: AlertTriangle },
  2: { key: 'fair', bar: 'bg-warning', text: 'text-warning-text', Icon: AlertTriangle },
  3: { key: 'good', bar: 'bg-warning', text: 'text-warning-text', Icon: Check },
  4: { key: 'strong', bar: 'bg-success', text: 'text-success', Icon: CheckCircle2 },
};

export interface PasswordStrengthProps {
  password: string;
  className?: string;
}

/**
 * Four-segment strength meter.
 *
 * The verdict is ALWAYS carried by an icon and a word, never by the bar colour
 * alone. brand-guidelines.md §3.5: "Never use color alone to convey state
 * (error/success/warning) — pair with icon + label." That matters more than
 * usual here, because the weak state uses `error` (#B23A32), which sits close
 * enough to `syn-red` (#EB1C24) — the colour of the submit button directly
 * below — to be genuinely ambiguous on hue alone.
 *
 * Renders nothing for an EMPTY field: an all-red meter before the user has
 * typed a character reads as a failure they have not yet had a chance to make.
 *
 * It does render for a non-empty password that scores zero. That case used to
 * fall through the same guard, so typing "abc" produced no meter at all and
 * the first feedback anyone got was an error on submit — silence where the
 * component's whole job is to say "not yet". A zero score is shown as `weak`,
 * which is what it is.
 */
export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const t = useTranslations('password');
  const score = scorePassword(password);

  if (!password) return null;

  const level = (score === 0 ? 1 : score) as Exclude<StrengthLevel, 0>;
  const meta = LEVEL_META[level];
  const { Icon } = meta;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption text-gray-500">{t('strengthLabel')}</span>
        <span className={cn('inline-flex items-center gap-1 text-caption font-medium', meta.text)}>
          <Icon aria-hidden size={13} strokeWidth={2.25} />
          {t(meta.key)}
        </span>
      </div>

      {/* The bar is decorative; the line above is the accessible verdict. */}
      <div aria-hidden className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cn('h-1.5 rounded-pill', segment <= level ? meta.bar : 'bg-gray-200')}
          />
        ))}
      </div>

      <p className="text-caption text-gray-500">{t('rule')}</p>
    </div>
  );
}

export default PasswordStrength;
