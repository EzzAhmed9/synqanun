'use client';

import * as React from 'react';
import { KeyRound, Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { completedTeam, useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { Badge, Button, Card } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { RANKS } from '@/lib/ranks';

/**
 * Step 5 — review and launch.
 *
 * THE CREDENTIALS LINE. BUILD_PLAN.md §3.1 provisions staff by temporary
 * password rather than by invitation, and this is the one place the flow says
 * so: a plain statement of what happens at launch, counting only rows that
 * were actually filled in. No invitation language, no pending state, and
 * nothing is sent — Track A has no mail.
 *
 * Each section links back to its own step. Because the wizard's state lives in
 * the layout's provider, going back and returning preserves everything already
 * entered — which is what makes a review step worth having at all.
 */
export default function ReviewStep() {
  const t = useTranslations('onboarding.review');
  const { branding, team, integrations, billing } = useOnboarding();

  const members = completedTeam(team);
  const canLaunch = branding.firmName.trim() !== '' && branding.subdomain.trim() !== '';

  return (
    <WizardShell
      step="review"
      title={t('title')}
      primaryAction={<LaunchButton canLaunch={canLaunch} />}
    >
      <div className="flex flex-col gap-6">
        <p className="text-body text-gray-600">{t('cardBody')}</p>

        <CredentialsNote count={members.length} />

        {/* --- Firm identity -------------------------------------------- */}
        <ReviewSection title={t('brandingSection')} href="/onboarding/branding">
          <BrandingSummary />
        </ReviewSection>

        {/* --- Team ------------------------------------------------------ */}
        <ReviewSection title={t('teamSection')} href="/onboarding/team">
          {members.length === 0 ? (
            <p className="text-body text-gray-500">{t('teamEmpty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {members.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-body text-gray-700">{member.name}</span>
                    <span
                      dir="ltr"
                      className="block truncate font-mono text-caption text-gray-500 [unicode-bidi:isolate]"
                    >
                      {member.email}
                    </span>
                  </span>
                  <RankBadge rank={member.rank} />
                </li>
              ))}
            </ul>
          )}
        </ReviewSection>

        {/* --- Integrations ---------------------------------------------- */}
        <ReviewSection title={t('integrationsSection')} href="/onboarding/integrations">
          <IntegrationsSummary mail={integrations.mail} meetings={integrations.meetings} />
        </ReviewSection>

        {/* --- Billing ---------------------------------------------------- */}
        <ReviewSection title={t('billingSection')} href="/onboarding/billing">
          <ul className="flex flex-col gap-1.5">
            {RANKS.map((rank) => (
              <RateSummaryRow key={rank} rank={rank} amount={billing.rates[rank]} currency={billing.currency} />
            ))}
          </ul>
        </ReviewSection>
      </div>
    </WizardShell>
  );
}

/* -------------------------------------------------------------------------- */

function CredentialsNote({ count }: { count: number }) {
  const t = useTranslations('onboarding.review');

  const message =
    count === 0
      ? t('credentialsNoteNone')
      : count === 1
        ? t('credentialsNoteOne')
        : t('credentialsNoteMany', { count });

  return (
    <Card surface="muted" padding="md">
      <p className="flex items-start gap-2.5 text-body text-gray-600">
        <KeyRound aria-hidden size={16} className="mt-0.5 shrink-0 text-legal-navy" />
        {message}
      </p>
    </Card>
  );
}

function ReviewSection({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('onboarding.review');

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <h2 className="text-title text-gray-700">{title}</h2>
        <Link href={href} className="text-caption font-medium text-legal-navy hover:underline">
          {t('edit')}
        </Link>
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

function BrandingSummary() {
  const tBranding = useTranslations('onboarding.branding');
  const { branding } = useOnboarding();

  return (
    <div className="flex flex-col divide-y divide-gray-200">
      <ReviewRow label={tBranding('firmName')} value={branding.firmName.trim() || null} />
      <ReviewRow
        label={tBranding('subdomain')}
        value={branding.subdomain.trim() ? `${branding.subdomain.trim()}.synqanun.com` : null}
        latin
      />
      <ReviewRow label={tBranding('logoLight')} value={branding.logoLightName} />
      <ReviewRow label={tBranding('logoDark')} value={branding.logoDarkName} />
      <ReviewRow label={tBranding('accent')} value={branding.accent} latin />
    </div>
  );
}

function ReviewRow({
  label,
  value,
  latin = false,
}: {
  label: string;
  value: string | null;
  latin?: boolean;
}) {
  const t = useTranslations('onboarding.review');

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2">
      <span className="text-caption text-gray-500">{label}</span>
      {value ? (
        <span
          dir={latin ? 'ltr' : undefined}
          className={
            latin
              ? 'font-mono text-reference text-gray-700 [unicode-bidi:isolate]'
              : 'text-body-emphasis text-gray-700'
          }
        >
          {value}
        </span>
      ) : (
        <span className="text-body text-gray-500">{t('notSet')}</span>
      )}
    </div>
  );
}

/**
 * The rank beside a colleague's name on the team summary.
 *
 * `holder`, not the bare category: the rate list further down this same page
 * takes the bare form, because there the rank IS the row rather than a
 * description of anybody. See lib/ranks.ts.
 */
function RankBadge({ rank }: { rank: (typeof RANKS)[number] }) {
  const tRanks = useTranslations('ranks');
  return <Badge tone="neutral">{tRanks(`holder.${rank}`)}</Badge>;
}

function IntegrationsSummary({
  mail,
  meetings,
}: {
  mail: 'google' | 'microsoft' | null;
  meetings: Array<'zoom' | 'teams' | 'meet'>;
}) {
  const t = useTranslations('onboarding.integrations');
  const tReview = useTranslations('onboarding.review');

  const connected = [
    ...(mail ? [t(mail === 'google' ? 'google' : 'microsoft')] : []),
    ...meetings.map((m) => t(m)),
  ];

  if (connected.length === 0) {
    return <p className="text-body text-gray-500">{tReview('noneSelected')}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connected.map((name) => (
        <Badge key={name} tone="success">
          {name}
        </Badge>
      ))}
    </div>
  );
}

function RateSummaryRow({
  rank,
  amount,
  currency,
}: {
  rank: (typeof RANKS)[number];
  amount: number;
  currency: string;
}) {
  const tRanks = useTranslations('ranks');

  // Western digits in both languages — design.md §12. `en-US` grouping is used
  // deliberately rather than the active locale, so an Arabic screen does not
  // switch to Arabic-Indic numerals.
  const formatted = new Intl.NumberFormat('en-US').format(amount);

  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-body text-gray-600">{tRanks(rank)}</span>
      <span dir="ltr" className="font-mono text-reference text-gray-700 [unicode-bidi:isolate]">
        {formatted} {currency}
      </span>
    </li>
  );
}

function LaunchButton({ canLaunch }: { canLaunch: boolean }) {
  const t = useTranslations('onboarding.review');
  const [state, setState] = React.useState<'idle' | 'launching' | 'done'>('idle');

  async function handleLaunch() {
    if (!canLaunch || state !== 'idle') return;
    setState('launching');
    // MOCK: provisions the tenant — creates the workspace record, the staff
    // accounts with their temporary passwords, and the rate card, then routes
    // into the new workspace. Track A.5, with the real database and auth.
    // No mail is sent in Track A, so nobody receives anything.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setState('done');
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant="primary"
        onClick={handleLaunch}
        disabled={!canLaunch}
        loading={state === 'launching'}
        icon={state === 'idle' ? <Rocket aria-hidden size={16} /> : undefined}
      >
        {state === 'launching' ? t('launching') : t('launch')}
      </Button>

      <p aria-live="polite" className="text-caption">
        {!canLaunch ? (
          <span className="text-warning-text">{t('incomplete')}</span>
        ) : state === 'done' ? (
          <span className="text-success">{t('launched')}</span>
        ) : null}
      </p>
    </div>
  );
}
