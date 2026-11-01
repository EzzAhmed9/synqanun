import { Clock, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { ResendEmailButton } from '@/components/auth/ResendEmailButton';
import { Card } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { RESET_LINK_TTL_MINUTES, mockApi } from '@/lib/mock-api';

/**
 * Staff password reset, state 2 of 3 — check your email.
 *
 * Muted envelope, not the feather — brand-guidelines.md §5 reserves the mark
 * for "the AI is present/acting", and nothing here is the agent doing
 * anything. Same call as the client flow.
 */
export default async function StaffResetSentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  /*
    MOCK: the address is resolved from the reset session, not carried from
    state 1. It must NOT arrive as a query parameter — that would put a staff
    member's email in the URL, in history, and in the referrer of anything this
    page links to.
  */
  const cookieStore = await cookies();
  const resetToken = cookieStore.get('syn_reset_token')?.value || 'reset_demo_token';
  const account = await mockApi.passwordReset.resolveToken(resetToken, 'staff');

  return <StaffResetSent email={account.email} />;
}

function StaffResetSent({ email }: { email: string }) {
  const t = useTranslations('passwordReset');

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="w-full max-w-[440px]">
        <Card padding="lg" className="text-center">
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-gray-600">
            <Mail aria-hidden size={22} strokeWidth={1.8} />
          </span>

          <h1 className="font-display text-heading text-gray-700">{t('sentHeading')}</h1>

          <p className="mt-2 text-body text-gray-600">
            {t.rich('sentBody', {
              email,
              // Latin run inside what may be an Arabic sentence — isolated so
              // the bidi algorithm does not reorder the address around its @
              // (design.md §12).
              addr: (chunks) => (
                <span
                  dir="ltr"
                  className="font-mono text-reference text-gray-700 [unicode-bidi:isolate]"
                >
                  {chunks}
                </span>
              ),
            })}
          </p>

          {/* Start-aligned inside a centred card: §7 forbids centred body copy,
              and this block is instructions rather than a headline. */}
          <div className="mt-6 rounded-card border border-gray-200 bg-gray-100 p-3.5 text-start">
            <p className="inline-flex items-center gap-2 text-caption font-medium text-gray-700">
              <Clock aria-hidden size={14} strokeWidth={2} className="text-legal-navy" />
              {t('expiryTitle', { minutes: RESET_LINK_TTL_MINUTES })}
            </p>
            <p className="mt-1.5 text-caption text-gray-500">{t('expiryBody')}</p>
          </div>

          <div className="mt-6">
            <ResendEmailButton email={email} />
          </div>

          <p className="mt-4 border-t border-gray-200 pt-4 text-caption text-gray-500">
            <Link href="/gateway/firm" className="font-medium text-legal-navy hover:underline">
              {t('backToSignIn')}
            </Link>
          </p>
        </Card>

        {/* Demo affordance, not part of the design — there is no mail here, so
            the prototype needs a visible way through. Delete when a real
            message drives the flow. */}
        <p className="mt-4 text-center text-caption text-gray-500">
          <Link href="/reset/staff/new" className="underline hover:text-gray-600">
            {t('demoOpenLink')}
          </Link>
        </p>
      </div>
    </main>
  );
}
