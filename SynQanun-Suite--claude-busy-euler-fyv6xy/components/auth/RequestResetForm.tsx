'use client';

import * as React from 'react';
import { AtSign } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Field, Input } from '@/components/ui';
import { Link, useRouter } from '@/lib/i18n/navigation';
// From the split-out module, not mock-api: this is a Client Component and
// mock-api.ts is server-only. See lib/password-reset.ts.
import { passwordReset } from '@/lib/password-reset';

export interface RequestResetFormProps {
  /** Where to go once the request is accepted — the flow's own "sent" state. */
  sentHref: string;
  /** The gateway this side signs in at. */
  signInHref: string;
  /** Already-translated. Differs by side: a client's address versus a
   *  firm-issued staff one. */
  emailLabel: string;
  emailHint: string;
}

/**
 * Reset state 1 — request a link. Shared by the client and staff flows.
 *
 * A Client Component so `onSubmit` can cancel the default. A `<form>` with no
 * handler performs a full-page GET and serialises its fields into the query
 * string; on this screen that would put the user's email address in the URL,
 * in browser history, and in any referrer that follows — the same defect
 * already fixed on both gateways.
 *
 * Navigation to state 2 carries NO query parameter for the same reason. The
 * next screen resolves the address server-side instead.
 */
export function RequestResetForm({
  sentHref,
  signInHref,
  emailLabel,
  emailHint,
}: RequestResetFormProps) {
  const t = useTranslations('passwordReset');
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);

    const email = new FormData(event.currentTarget).get('email');
    await passwordReset.request(String(email ?? ''));

    // Always advances, whatever was typed. That is not a shortcut — it mirrors
    // the behaviour the real endpoint must have: responding differently for an
    // unknown address turns this into an account-enumeration oracle, which for
    // a legal product discloses who a firm acts for, and on the staff side who
    // it employs. See the MOCK on passwordReset.request.
    router.push(sentHref);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <Field htmlFor="reset-email" label={emailLabel} hint={emailHint}>
        {/*
          dir="ltr" on the WRAPPER, not only the input. The value is a Latin
          email address, so the input carries dir="ltr" and its `pe-10` reserve
          resolves to padding-RIGHT. Left as an RTL wrapper, the icon's
          `insetInlineEnd` would resolve LEFT — reserve and adornment on
          opposite sides, and in Arabic the icon lands on top of the first
          characters of the address.
        */}
        <div className="relative" dir="ltr">
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('emailPlaceholder')}
            latinValue
            className="pe-10"
            required
          />
          <AtSign
            aria-hidden
            size={16}
            className="absolute top-1/2 -translate-y-1/2 text-gray-500"
            style={{ insetInlineEnd: '0.875rem' }}
          />
        </div>
      </Field>

      {/* syn-red: requesting the reset is the user's own action — design.md §2. */}
      <Button type="submit" variant="primary" fullWidth loading={pending} className="mt-2">
        {t('sendLink')}
      </Button>

      <p className="mt-2 border-t border-gray-200 pt-4 text-center text-caption text-gray-500">
        <Link href={signInHref} className="font-medium text-legal-navy hover:underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </form>
  );
}

export default RequestResetForm;
