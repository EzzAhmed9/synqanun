import { FolderOpen, MessageSquare, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { TenantFooter } from '@/components/chrome/TenantFooter';
import { AuthHeader } from '@/components/chrome/AuthHeader';
import { Badge, Card, CardContent, CardTitle } from '@/components/ui';
import { demoFirm, firmName } from '@/fixtures/firm';
import type { Invite } from '@/fixtures/invites';
import { mockApi } from '@/lib/mock-api';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { ActivationForm } from './ActivationForm';

/**
 * Accept Invite (client) — the invitation activation screen.
 *
 * Shares the Client Gateway's shape rather than Splash's: a firm-identity
 * header bar, a wide top-aligned two-column grid, and a footer pairing the
 * tenant's copyright with the SynQanun credit. The header bar is now the same
 * component on both (components/chrome/AuthHeader.tsx) — extracted only once a
 * second real screen demanded it, not guessed from the first.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE PREFILLED PASSWORDS. The export ships both password fields with
 *    `value="LegalSecure#2025!"` baked into the markup. A real-looking
 *    credential sitting in a prototype that gets screen-shared is a habit
 *    worth not forming. Both fields start empty.
 *
 *  · THE EMERALD PALETTE. emerald-500/600/50/200 appear throughout the export.
 *    design.md §2's token for an affirmative state is `success` (#1E7A4C);
 *    globals.css clears Tailwind's stock palette so emerald cannot compile.
 *
 *  · "SOC 2 Type II Certified", "SHA-256 Vault Encryption", "Single-tenant
 *    isolated instance", "Protected by privileged attorney-client credential
 *    policies (SHA-256 standard)". Same call as the Client Gateway: Track A
 *    has no authentication at all, and SOC 2 Type II is a real audited
 *    attestation. brand-guidelines.md §6 — precise over persuasive, and the
 *    product does not sell within its own UI. The panel slot those claims
 *    occupied now carries something true and useful instead: who sent the
 *    invitation and when it expires, both from the fixture.
 *
 *  · THE {{CLIENT_LOGO}} SLOTS. The export places one in the header and a
 *    second above the activation card. Omitted, consistent with the Client
 *    Gateway. Note that brand-guidelines.md §7.1 item 1 does permit a client
 *    logo on this screen; it is moot in the demo because demoFirm.logoLight is
 *    null, so restoring it is a fixture change rather than a rebuild.
 */
export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // MOCK: the token comes from the invitation URL in the real flow, and must be
  // verified server-side before any invitee detail is rendered. The route is
  // /invite/client rather than /invite/[token] so the prototype is clickable
  // without anyone having to paste a token.
  const invite = await mockApi.invites.getByToken('inv_7Kq2wE9bXr4T');

  return <AcceptInvite locale={locale as Locale} invite={invite} />;
}

function AcceptInvite({ locale, invite }: { locale: Locale; invite: Invite }) {
  const t = useTranslations('acceptInvite');
  const tFeatures = useTranslations('acceptInvite.features');

  const features = [
    { icon: FolderOpen, title: tFeatures('vaultTitle'), body: tFeatures('vaultBody') },
    { icon: MessageSquare, title: tFeatures('commsTitle'), body: tFeatures('commsBody') },
  ];

  // design.md §12: Western (0–9) digits in BOTH languages for dates. The
  // `-u-nu-latn` extension keeps Arabic month names while forcing Latin
  // numerals, which is the standard in Egyptian/GCC legal documents.
  //
  // `timeZone` is explicit and deliberate. Without it, Intl formats in whatever
  // zone the runtime is in: an expiry at 23:59 in the tenant's zone renders as
  // the NEXT day for anyone an hour ahead, and the server and client renders
  // disagree — a hydration error as well as a wrong date. A deadline shown to a
  // client must be stated in the firm's zone, not the reader's.
  // MOCK: hardcoded to the demo tenant's zone; this becomes a tenant setting.
  const expiryDate = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Cairo',
  }).format(new Date(invite.expiresAt));

  return (
    <>
      <AuthHeader
        firmName={firmName(locale)}
        tagline={demoFirm.tagline[locale]}
        context={t('headerContext')}
        status={t('channelStatus')}
        helpdeskLabel={t('helpdesk')}
      />

      <main className="mx-auto w-full max-w-content flex-1 px-6 py-10">
        <div className="grid grid-cols-1 gap-8 desktop:grid-cols-12 desktop:gap-6">
          {/* Activation card first in the DOM: it is the task, so it leads the
              tab order and stacks first on mobile. `desktop:order-2` moves it
              to the end column, which is right in English and left in Arabic. */}
          <div className="flex flex-col desktop:order-2 desktop:col-span-6">
            <div className="mb-3 flex justify-end">
              {/* MOCK: always "verified" in Track A — the token is never checked. */}
              <Badge tone="success">{t('verifiedInvite')}</Badge>
            </div>

            <Card padding="lg">
              <div className="border-b border-gray-200 pb-5">
                <h1 className="font-display text-heading text-gray-700">
                  {t('cardHeading', { firm: firmName(locale) })}
                </h1>
                <p className="mt-1.5 text-body text-gray-600">
                  {t('cardSubtitle', { name: invite.inviteeName[locale] })}
                </p>
              </div>

              <ActivationForm email={invite.email} />
            </Card>

            <p className="mt-4 text-center text-caption text-gray-500">
              {t('alreadyActive')}{' '}
              <Link href="/gateway/client" className="font-medium text-legal-navy hover:underline">
                {t('signInLink')}
              </Link>
            </p>
          </div>

          {/* --- Firm context panel ---------------------------------------- */}
          <div className="flex flex-col gap-6 desktop:order-1 desktop:col-span-6">
            <Card padding="lg">
              <Badge
                tone="neutral"
                icon={<ShieldCheck aria-hidden size={13} strokeWidth={2.25} className="text-legal-navy" />}
              >
                {t('panelBadge')}
              </Badge>

              {/* Display scale, one per screen — design.md §3. */}
              <h2 className="mt-4 font-display text-display text-gray-700">{t('panelHeading')}</h2>
              <p className="mt-3 text-body text-gray-600">{t('panelBody')}</p>

              {/* {{CLIENT_ABOUT_TEXT}}.practiceAreas — design.md §10.1 lists the
                  Client Gateway as the only screen cleared for this token, and
                  this screen is not on that list, so only the firm's own
                  practice areas are shown here via the same fixture field the
                  Gateway uses. If this screen should carry the full about copy,
                  §10.1's list is what gets amended first. */}
              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-200 pt-4">
                {demoFirm.practiceAreas[locale].map((area) => (
                  <li key={area} className="text-caption text-gray-500">
                    {area}
                  </li>
                ))}
              </ul>
            </Card>

            <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
              {features.map(({ icon: Icon, title, body }) => (
                <Card key={title} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-gray-100 text-legal-navy">
                    <Icon aria-hidden size={16} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0">
                    <CardTitle className="text-body-emphasis">{title}</CardTitle>
                    <CardContent className="mt-0.5 text-caption text-gray-500">{body}</CardContent>
                  </span>
                </Card>
              ))}
            </div>

            {/* Replaces the export's SOC 2 / single-tenant compliance box with
                facts the system actually holds. */}
            <Card surface="muted" padding="sm">
              <CardContent className="flex flex-col gap-1 text-caption text-gray-500">
                <span>{t('invitedBy', { name: invite.invitedBy[locale] })}</span>
                <span>{t('expires', { date: expiryDate })}</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <TenantFooter firmName={firmName(locale)} copyright={t('copyright')} />
    </>
  );
}
