'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Field,
  Input,
  PasswordInput,
  PasswordStrength,
  scorePassword,
} from '@/components/ui';
import { Link, useRouter } from '@/lib/i18n/navigation';
// From the split-out module, not mock-api: this is a Client Component and
// mock-api.ts is server-only. See lib/password-reset.ts.
import { passwordReset } from '@/lib/password-reset';

export interface NewPasswordFormProps {
  /** Resolved from the reset token — read-only, never editable here. */
  email: string;
  /** Where to send the user once the password is set, and from the back link. */
  signInHref: string;
}

/**
 * Reset state 3 — choose the new password. Shared by the client and staff
 * flows, which differ only in where they return to.
 *
 * Structurally the same form as Accept Invite's ActivationForm, minus the
 * terms checkbox: someone resetting a password has already accepted the terms.
 * Those two are NOT merged — they submit to different endpoints and one gates
 * on consent while the other must not, so sharing them would mean a `mode`
 * prop threading through every difference.
 */
export function NewPasswordForm({ email, signInHref }: NewPasswordFormProps) {
  const t = useTranslations('passwordReset');
  const router = useRouter();

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const score = scorePassword(password);
  const tooWeak = password.length > 0 && score < 3;
  const mismatch = confirm.length > 0 && confirm !== password;

  // Messages appear only after a submit attempt, so the form does not scold
  // someone still mid-keystroke.
  const passwordError = submitted && (tooWeak || password.length === 0) ? t('tooWeak') : undefined;
  const confirmError = submitted && mismatch ? t('mismatch') : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (pending) return;
    if (password.length === 0 || tooWeak || mismatch || confirm.length === 0) return;

    setPending(true);
    const match = typeof document !== 'undefined' ? document.cookie.match(/(^|;\s*)syn_reset_token=([^;]*)/) : null;
    const token = match ? match[2] : 'reset_demo_token';
    await passwordReset.complete(token, password);
    router.push(signInHref);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <Field htmlFor="reset-account-email" label={t('accountEmail')} hint={t('verified')}>
        {/* dir="ltr" on the wrapper so the value, its padding reserve and the
            tick all resolve to the same end — see PasswordInput's note. */}
        <div className="relative" dir="ltr">
          <Input
            id="reset-account-email"
            name="email"
            type="email"
            value={email}
            readOnly
            latinValue
            className="pe-10"
          />
          <Check
            aria-hidden
            size={16}
            strokeWidth={2.25}
            className="absolute top-1/2 -translate-y-1/2 text-success"
            style={{ insetInlineEnd: '0.875rem' }}
          />
        </div>
      </Field>

      <Field htmlFor="reset-new-password" label={t('newPassword')} error={passwordError}>
        <PasswordInput
          id="reset-new-password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={Boolean(passwordError)}
        />
      </Field>

      <PasswordStrength password={password} className="-mt-1" />

      <Field htmlFor="reset-confirm-password" label={t('confirmPassword')} error={confirmError}>
        <PasswordInput
          id="reset-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          invalid={Boolean(confirmError)}
        />
      </Field>

      {/* syn-red: setting the password is the user's own action — design.md §2. */}
      <Button type="submit" variant="primary" fullWidth loading={pending} className="mt-2">
        {t('update')}
      </Button>

      <p className="mt-2 border-t border-gray-200 pt-4 text-center text-caption text-gray-500">
        <Link href={signInHref} className="font-medium text-legal-navy hover:underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </form>
  );
}

export default NewPasswordForm;
