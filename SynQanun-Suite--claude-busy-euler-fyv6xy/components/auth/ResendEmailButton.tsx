'use client';

import * as React from 'react';
import { Check, RotateCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
// From the split-out module, not mock-api: this is a Client Component and
// mock-api.ts is server-only. See lib/password-reset.ts.
import { passwordReset } from '@/lib/password-reset';

export interface ResendEmailButtonProps {
  email: string;
}

/**
 * "Resend email" with a confirmation.
 *
 * Shared by the client and staff reset flows — identical behaviour on both, so
 * it lives here rather than in either route.
 *
 * The export renders a bare button that does nothing visible when pressed. On
 * a screen whose entire purpose is waiting for a message that has not arrived,
 * a button with no feedback invites the user to press it repeatedly and still
 * not know whether anything happened.
 *
 * The confirmation is announced with `aria-live="polite"`: the visual change
 * is the only signal, so without it a screen-reader user gets nothing at all.
 *
 * Secondary variant, not primary. design.md §4 allows one primary action per
 * view, and on this screen the intended action is to go and read your email —
 * not to press this again.
 */
export function ResendEmailButton({ email }: ResendEmailButtonProps) {
  const t = useTranslations('passwordReset');
  const [state, setState] = React.useState<'idle' | 'sending' | 'sent'>('idle');

  async function handleResend() {
    if (state === 'sending') return;
    setState('sending');
    // MOCK: must invalidate the previous token and be rate-limited — see the
    // MOCK on passwordReset.resend.
    await passwordReset.resend(email);
    setState('sent');
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        fullWidth
        onClick={handleResend}
        loading={state === 'sending'}
        icon={state === 'sending' ? undefined : <RotateCw aria-hidden size={16} />}
      >
        {state === 'sending' ? t('resending') : t('resend')}
      </Button>

      {/* Reserved politely rather than shown as an alert: nothing has gone
          wrong, so this is not an error state. */}
      <p aria-live="polite" className="min-h-[18px] text-caption text-success">
        {state === 'sent' ? (
          <span className="inline-flex items-center gap-1.5">
            <Check aria-hidden size={13} strokeWidth={2.25} />
            {t('resent')}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export default ResendEmailButton;
