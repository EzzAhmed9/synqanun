'use client';

import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Button, Checkbox, Field, Input, PasswordInput } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { signInAction } from '@/app/[locale]/(auth)/sign-in-action';

/**
 * The credential form inside a themed tenant's dark sign-in card.
 * Connected to live FastAPI authentication and PostgreSQL database.
 */
export function TenantSignInForm({ portal }: { portal: 'staff' | 'client' }) {
  const t = useTranslations('tenantAuth.form');
  const locale = useLocale();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    startTransition(async () => {
      try {
        const res = await signInAction(cleanUsername, password);
        if (!res.ok) {
          setError(res.error || 'بيانات الدخول غير صحيحة');
          return;
        }
        const destination = portal === 'client' ? `/${locale}/client` : `/${locale}/staff`;
        window.location.href = destination;
      } catch (err: any) {
        setError(err.message || 'حدث خطأ في الاتصال بالخادم');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      {error && (
        <div className="rounded-card border border-red-500/40 bg-red-950/60 p-3 text-caption text-red-200">
          {error}
        </div>
      )}

      <Field htmlFor={`${portal}-username`} label={t('usernameLabel')} onDark>
        <Input
          id={`${portal}-username`}
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          placeholder={t('usernamePlaceholder')}
          // A username or email is Latin in both locales — design.md §12.
          latinValue
          onDark
        />
      </Field>

      <Field htmlFor={`${portal}-password`} label={t('passwordLabel')} onDark>
        <PasswordInput
          id={`${portal}-password`}
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder={t('passwordPlaceholder')}
          onDark
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Checkbox name="remember" label={t('remember')} onDark />
        <Link
          href={portal === 'staff' ? '/reset/staff' : '/reset/client'}
          className="text-caption font-medium text-on-dark underline underline-offset-2"
        >
          {t('forgotPassword')}
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        disabled={isPending}
        className="mt-2 border-ornament"
        iconEnd={
          !isPending ? (
            <ArrowRight aria-hidden size={16} strokeWidth={2} className="rtl:-scale-x-100" />
          ) : undefined
        }
      >
        {isPending ? 'جاري تسجيل الدخول...' : t('signIn')}
      </Button>
    </form>
  );
}

export default TenantSignInForm;
