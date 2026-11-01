import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { RequestResetForm } from '@/components/auth/RequestResetForm';
import { Badge, Card } from '@/components/ui';
import { RESET_LINK_TTL_MINUTES } from '@/lib/mock-api';

/**
 * Password reset, state 1 of 3 — request a link.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · "SHA-256 Vault Encryption", "Single-tenant isolated instance",
 *    "SOC 2 Type II Certified", "bound to your single-tenant client enclave",
 *    and "Protected by privileged attorney-client credential policies
 *    (SHA-256 standard)". Five separate infrastructure and certification
 *    claims on one screen. SOC 2 Type II is a real audited attestation and
 *    Track A has no authentication at all. brand-guidelines.md §6: precise
 *    over persuasive, and the product does not sell within its own UI.
 *
 *  · THE LAVENDER BADGE TINT. The export styles its panel badge
 *    `bg-[#F4F2FD] border-[#DAD9E4]` — a colour that appears nowhere in
 *    design.md §2. Uses the neutral Badge token instead.
 *
 *  · THE {{CLIENT_LOGO}} SLOTS, in the header and again above the card.
 *    Consistent with the other client-facing screens.
 *
 * What replaces them is the one thing on that panel that is both true and
 * useful: how the link behaves — single use, and expiring after
 * RESET_LINK_TTL_MINUTES.
 */
export default async function RequestResetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RequestReset />;
}

function RequestReset() {
  const t = useTranslations('passwordReset');

  return (
    <main className="mx-auto w-full max-w-content flex-1 px-6 py-10">
      <div className="grid grid-cols-1 gap-8 desktop:grid-cols-12 desktop:gap-6">
        {/* Form card first in the DOM: it is the task, so it leads the tab
            order and stacks first on mobile. `desktop:order-2` moves it to the
            end column — right in English, left in Arabic. */}
        <div className="desktop:order-2 desktop:col-span-5">
          <Card padding="lg">
            <h1 className="font-display text-heading text-gray-700">{t('requestHeading')}</h1>
            <p className="mt-1.5 text-body text-gray-600">{t('requestSubtitle')}</p>
            <RequestResetForm
              sentHref="/reset/client/sent"
              signInHref="/gateway/client"
              emailLabel={t('emailLabel')}
              emailHint={t('emailHint')}
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

            {/* Display scale, one per screen — design.md §3. */}
            <h2 className="mt-4 font-display text-display text-gray-700">
              {t('requestPanelHeading')}
            </h2>
            <p className="mt-3 text-body text-gray-600">
              {t('requestPanelBody', { minutes: RESET_LINK_TTL_MINUTES })}
            </p>

            {/* Stating the enumeration behaviour out loud, because a user who
                mistypes their address and sees a success screen otherwise
                assumes the mail is coming. */}
            <p className="mt-5 border-t border-gray-200 pt-4 text-caption text-gray-500">
              {t('requestPanelNote')}
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
