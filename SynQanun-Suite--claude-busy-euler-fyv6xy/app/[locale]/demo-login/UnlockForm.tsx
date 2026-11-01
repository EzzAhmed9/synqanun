'use client';

import * as React from 'react';
import { LockKeyhole } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Field, PasswordInput } from '@/components/ui';
import { unlockDemo } from './unlock-action';

/**
 * The one form in this product that actually checks what you type.
 *
 * Every other credential field here is an honest no-op — the gateways cancel
 * their own submit rather than fake a session. This one is different because it
 * is not pretending to be authentication: it is the deployment's front door,
 * and it either opens or it does not.
 *
 * `onSubmit` still cancels the default, for the same reason the gateways do: a
 * form with no handler performs a full-page GET and serialises its fields into
 * the query string, which would put the shared password in the address bar,
 * in history, and in the next Referer header.
 *
 * On success it navigates with a FULL page load rather than a client-side push.
 * The cookie was set by the Server Action, and the gate that has to see it is
 * middleware — which only runs on a document request. A soft navigation would
 * ask the router for a route the middleware never re-evaluated.
 */
export function UnlockForm({ next }: { next: string }) {
  const t = useTranslations('demoLogin');

  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<'wrong' | 'notConfigured' | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await unlockDemo(password);
      if (result.ok) {
        window.location.assign(next);
        return;
      }
      setError(result.error);
      setPassword('');
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-4">
      <Field htmlFor="demo-password" label={t('passwordLabel')}>
        <PasswordInput
          id="demo-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError(null);
          }}
          autoComplete="current-password"
          autoFocus
        />
      </Field>

      {error ? (
        // role="alert" so the failure is announced rather than only seen.
        <p role="alert" className="text-caption text-error">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={pending}
        disabled={password.length === 0}
        icon={<LockKeyhole aria-hidden size={15} />}
      >
        {t('submit')}
      </Button>
    </form>
  );
}

export default UnlockForm;
