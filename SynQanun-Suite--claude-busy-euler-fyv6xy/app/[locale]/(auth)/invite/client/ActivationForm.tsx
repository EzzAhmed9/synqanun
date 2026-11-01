'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Checkbox,
  Field,
  Input,
  PasswordInput,
  PasswordStrength,
  scorePassword,
} from '@/components/ui';

export interface ActivationFormProps {
  /** Fixed to the invitation — the invitee may read it but never change it. */
  email: string;
}

/**
 * The invitation activation form.
 *
 * Split out as a Client Component so the page itself stays a Server Component
 * and can resolve the invite through lib/mock-api.ts. Only the interactive
 * part ships to the browser.
 */
export function ActivationForm({ email }: ActivationFormProps) {
  const t = useTranslations('acceptInvite');

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [accepted, setAccepted] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const score = scorePassword(password);
  const tooWeak = password.length > 0 && score < 3;
  const mismatch = confirm.length > 0 && confirm !== password;

  // Validation messages appear only after a submit attempt, so the form does
  // not scold someone who is still mid-keystroke.
  const passwordError = submitted && tooWeak ? t('tooWeak') : undefined;
  const confirmError = submitted && mismatch ? t('mismatch') : undefined;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    // MOCK: on success this calls mockApi.invites.accept(token, password) and
    // routes into the client portal. Wired up when the portal dashboard exists
    // in Batch 2. Server-side password policy, token burn and session issue all
    // belong to Track A.5's real authentication — see the MOCK on that endpoint.
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <Field htmlFor="invite-email" label={t('emailLabel')} hint={t('emailFixed')}>
        {/* dir="ltr" on the wrapper for the same reason as PasswordInput: the
            email value is Latin, so its padding reserve and the confirmation
            tick must resolve to the same end. Without this the tick rendered
            on top of the address in Arabic. */}
        <div className="relative" dir="ltr">
          <Input
            id="invite-email"
            name="email"
            type="email"
            value={email}
            readOnly
            latinValue
            className="pe-10"
          />
          {/* `success`, not the export's emerald. Decorative — the read-only
              state is already stated by the hint text below the field. */}
          <Check
            aria-hidden
            size={16}
            strokeWidth={2.25}
            className="absolute top-1/2 -translate-y-1/2 text-success"
            style={{ insetInlineEnd: '0.875rem' }}
          />
        </div>
      </Field>

      <Field htmlFor="invite-password" label={t('createPassword')} error={passwordError}>
        <PasswordInput
          id="invite-password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          invalid={Boolean(passwordError)}
        />
      </Field>

      <PasswordStrength password={password} className="-mt-1" />

      <Field htmlFor="invite-confirm" label={t('confirmPassword')} error={confirmError}>
        <PasswordInput
          id="invite-confirm"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          invalid={Boolean(confirmError)}
        />
      </Field>

      <Checkbox
        name="acceptTerms"
        checked={accepted}
        onChange={(e) => setAccepted(e.target.checked)}
        className="mt-1"
        /*
          The visible label carries two links, and the browser's accessible-name
          computation drops their text — a screen reader announced this control
          as "I agree to the and the", which is consent to nothing. Restating
          the full sentence here makes the name complete; the links stay
          separately reachable in the label for sighted and keyboard users.
        */
        aria-label={`${t('termsPrefix')} ${t('terms')} ${t('termsJoin')} ${t('privacy')}`}
        label={
          <>
            {t('termsPrefix')}{' '}
            {/* MOCK: point at the real policy documents. */}
            <a href="#terms" className="font-medium text-legal-navy hover:underline">
              {t('terms')}
            </a>{' '}
            {t('termsJoin')}{' '}
            <a href="#privacy" className="font-medium text-legal-navy hover:underline">
              {t('privacy')}
            </a>
          </>
        }
      />

      {/*
        syn-red: activating the account is the invitee's own action —
        design.md §2's human/AI split. One primary button per view.

        Left enabled until the terms box is ticked would let someone submit
        without consenting; disabling it is the simplest honest gate, and the
        checkbox directly above explains why.
      */}
      <Button type="submit" variant="primary" fullWidth disabled={!accepted} className="mt-2">
        {t('activate')}
      </Button>
    </form>
  );
}

export default ActivationForm;
