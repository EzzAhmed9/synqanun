'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Card,
  Field,
  PasswordInput,
  PasswordStrength,
  scorePassword,
} from '@/components/ui';

/**
 * Changing the portal password from inside a signed-in session.
 *
 * WHY THIS IS NOT components/auth/NewPasswordForm
 * ---------------------------------------------------------------------------
 * That component is built for the RESET flow: it takes an email resolved from a
 * verified token, calls `mockApi.passwordReset.complete`, and pushes to the
 * sign-in screen when it is done. None of the three fits here. Changing a
 * password while signed in needs the CURRENT one — the whole point is proving
 * it is still you at the keyboard, which a reset link proves a different way —
 * and it must not end by throwing you out to a login page.
 *
 * So the primitives are shared and the form is not, which is the same call
 * NewPasswordForm's own header makes about ActivationForm: "they submit to
 * different endpoints and one gates on consent while the other must not, so
 * sharing them would mean a `mode` prop threading through every difference."
 * Third instance of that argument, same answer. <PasswordInput>,
 * <PasswordStrength> and `scorePassword` are all reused verbatim, so the
 * strength rule cannot drift between the two screens.
 *
 * NOT CARRIED OVER FROM THE EXPORT
 * ---------------------------------------------------------------------------
 *  · A PREFILLED NEW PASSWORD. Both language versions ship
 *    `value="K9#mQ8$vL2!eZ9"` in the markup, with a four-bar "Strong Password"
 *    meter scoring it. A password in a fixture is a password in the repository.
 *  · "UAE PASS Digital Authentication Linked — Verified identity (Emirates ID
 *    ending in 4921)" and "Dual-factor verification active". No identity
 *    provider is connected, no Emirates ID is held, and there is no second
 *    factor. BUILD_PLAN.md §6 puts 2FA in Track B's hardening pass, so claiming
 *    it is active today is a claim about the one thing on a settings screen a
 *    client would most reasonably rely on.
 *  · "Security & Logs" — a sign-in history, over a build with no sessions to
 *    log.
 */
export function PasswordPanel() {
  const t = useTranslations('settings.password');

  const [current, setCurrent] = React.useState('');
  const [next, setNext] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [attempted, setAttempted] = React.useState(false);

  const score = scorePassword(next);
  const tooWeak = next.length > 0 && score < 3;
  const mismatch = confirm.length > 0 && confirm !== next;

  // Messages appear only after a submit attempt, so the form does not scold
  // someone still mid-keystroke. Same rule as the reset flow.
  const currentError = submitted && current.length === 0 ? t('currentRequired') : undefined;
  const nextError = submitted && (tooWeak || next.length === 0) ? t('tooWeak') : undefined;
  const confirmError = submitted && mismatch ? t('mismatch') : undefined;

  function handleSubmit(event: React.FormEvent) {
    // Without this, submitting would be a GET that puts the OLD and the NEW
    // password in the query string, in browser history and in the next Referer
    // header. That is precisely what the Client Gateway shipped once.
    event.preventDefault();
    setSubmitted(true);
    setAttempted(false);

    if (current.length === 0 || next.length === 0 || tooWeak || mismatch || confirm.length === 0) {
      return;
    }

    // MOCK: replace with POST /api/account/password — verify the current
    // password server-side, enforce the policy there (the meter below is
    // guidance, never the control), hash the new credential, and invalidate the
    // account's other sessions. Track A.5, with real authentication.
    setAttempted(true);
  }

  return (
    <Card padding="lg">
      <div className="border-b border-gray-200 pb-3">
        <h2 className="font-sans text-title text-gray-700">{t('heading')}</h2>
        <p className="mt-0.5 text-caption text-gray-500">{t('caption')}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex max-w-md flex-col gap-4" noValidate>
        <Field htmlFor="password-current" label={t('current')} error={currentError}>
          <PasswordInput
            id="password-current"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            invalid={Boolean(currentError)}
          />
        </Field>

        <Field htmlFor="password-new" label={t('new')} error={nextError}>
          <PasswordInput
            id="password-new"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            invalid={Boolean(nextError)}
          />
        </Field>

        {/* The same meter the reset flow uses, scoring a real value rather than
            a hardcoded four green bars. */}
        <PasswordStrength password={next} className="-mt-1" />

        <Field htmlFor="password-confirm" label={t('confirm')} error={confirmError}>
          <PasswordInput
            id="password-confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            invalid={Boolean(confirmError)}
          />
        </Field>

        {/* syn-red: changing your own password is your own action (design.md
            §2). One per view, and the tabs are real URLs, so this is the only
            primary on screen when the Security tab is open. */}
        <Button type="submit" variant="primary" className="mt-1 self-start">
          {t('update')}
        </Button>

        {attempted ? (
          <p role="status" className="text-caption text-gray-600">
            {t('notChanged')}
          </p>
        ) : null}
      </form>
    </Card>
  );
}

export default PasswordPanel;
