'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button, Checkbox, Field, Input, PasswordInput } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { signInAction } from '../../sign-in-action';

/**
 * Staff credential form with live authentication.
 */
export function StaffSignInForm() {
  const t = useTranslations('firmGateway');
  const locale = useLocale();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    startTransition(async () => {
      try {
        const res = await signInAction(cleanEmail, password);
        if (!res.ok) {
          setError(res.error || 'بيانات الدخول غير صحيحة');
          return;
        }
        // Full guaranteed navigation carrying all session cookies
        window.location.href = `/${locale}/staff`;
      } catch (err: any) {
        setError(err.message || 'حدث خطأ في الاتصال بالخادم');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      {error && (
        <div className="rounded-card border border-red-200 bg-red-50 p-3 text-caption text-red-700">
          {error}
        </div>
      )}

      <Field htmlFor="staff-email" label={t('emailLabel')}>
        <Input
          id="staff-email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          placeholder={t('emailPlaceholder')}
          latinValue
        />
      </Field>

      <Field
        htmlFor="staff-password"
        label={t('passwordLabel')}
        action={
          <Link
            href="/reset/staff"
            className="text-caption font-medium text-legal-navy hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        }
      >
        <PasswordInput
          id="staff-password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </Field>

      <Checkbox name="keepSignedIn" label={t('keepSignedIn')} />

      <Button type="submit" variant="primary" fullWidth className="mt-2" disabled={isPending}>
        {isPending ? 'جاري تسجيل الدخول...' : t('signIn')}
      </Button>

      {/* Safety net for a client who has landed on the staff gateway by
          mistake. Points AWAY from this screen, to the portal they want. */}
      <p className="mt-2 border-t border-gray-200 pt-4 text-center text-caption text-gray-500">
        {t('clientPrompt')}{' '}
        <Link href="/gateway/client" className="font-medium text-legal-navy hover:underline">
          {t('clientLink')}
        </Link>
      </p>
    </form>
  );
}

export default StaffSignInForm;
