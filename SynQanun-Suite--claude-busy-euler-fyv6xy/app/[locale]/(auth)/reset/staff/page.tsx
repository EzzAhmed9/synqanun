import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { RequestResetForm } from '@/components/auth/RequestResetForm';
import { Badge, Card } from '@/components/ui';
import { RESET_LINK_TTL_MINUTES } from '@/lib/mock-api';

/**
 * Staff password reset, state 1 of 3 — request a link.
 *
 * BUILD_PLAN.md §3.1 makes this flow load-bearing for staff, not just a
 * convenience: it is how someone changes the temporary password they were
 * provisioned with. There is no forced change on first login, so this is the
 * only route to a password of their own choosing.
 *
 * The form, the resend button and the set-password form are the same
 * components the client flow uses. Only the copy, the sign-in destination and
 * the header differ.
 */
export default async function StaffRequestResetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <StaffRequestReset />;
}

function StaffRequestReset() {
  const t = useTranslations('passwordReset');
  const tStaff = useTranslations('staffReset');

  return (
    <main className="mx-auto w-full max-w-content flex-1 px-6 py-10">
      <div className="grid grid-cols-1 gap-8 desktop:grid-cols-12 desktop:gap-6">
        {/* Form card leads the DOM: it is the task, so it leads the tab order
            and stacks first on mobile. `desktop:order-2` puts it in the end
            column — right in English, left in Arabic. */}
        <div className="desktop:order-2 desktop:col-span-5">
          <Card padding="lg">
            <h1 className="font-display text-heading text-gray-700">{t('requestHeading')}</h1>
            <p className="mt-1.5 text-body text-gray-600">{t('requestSubtitle')}</p>
            <RequestResetForm
              sentHref="/reset/staff/sent"
              signInHref="/gateway/firm"
              emailLabel={tStaff('emailLabel')}
              emailHint={tStaff('emailHint')}
            />
          </Card>
        </div>

        <div className="desktop:order-1 desktop:col-span-7">
          <Card padding="lg">
            <Badge
              tone="neutral"
              icon={<KeyRound aria-hidden size={13} strokeWidth={2.25} className="text-legal-navy" />}
            >
              {t('requestPanelBadge')}
            </Badge>

            <h2 className="mt-4 font-display text-display text-gray-700">
              {tStaff('requestPanelHeading')}
            </h2>
            <p className="mt-3 text-body text-gray-600">
              {tStaff('requestPanelBody', { minutes: RESET_LINK_TTL_MINUTES })}
            </p>

            {/* Same enumeration note as the client flow. On the staff side the
                disclosure is who a firm employs rather than who it acts for,
                which is no less worth not leaking. */}
            <p className="mt-5 border-t border-gray-200 pt-4 text-caption text-gray-500">
              {t('requestPanelNote')}
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
