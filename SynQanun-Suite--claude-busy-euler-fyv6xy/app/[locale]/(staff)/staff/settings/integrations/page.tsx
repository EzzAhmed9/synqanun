import { CalendarCheck, CreditCard, Info, PenLine, Plug, Video, Landmark } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge, Card } from '@/components/ui';
import type { IntegrationCategory, IntegrationRecord } from '@/fixtures/integrations';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type IntegrationSummary } from '@/lib/mock-api';
import type { Rank } from '@/lib/ranks';
import { SettingsNotPermitted, SettingsShell } from '../SettingsShell';
import { settingsTabAllows } from '../tabs';
import { OnlyOfficeSettingsCard } from './OnlyOfficeSettingsCard';

/**
 * Settings → Integrations — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * NO CONNECT BUTTON, AND NO DISCONNECT EITHER
 * ===========================================================================
 * BUILD_PLAN §5 puts integrations in the demo "shown as already connected in
 * fixture data — no real OAuth flow in Track A", and §6 puts the real flows in
 * TRACK B rather than A.5, because they need provider-side business
 * verification and a security review.
 *
 * §5.1 says a no-op has to be STATED rather than silent. It does not say every
 * missing capability needs a button in front of it. A Connect control here
 * would be the longest-lived inert control in the product — two whole tracks
 * from doing anything — and pressing it would be the moment a demo audience
 * learns the screen is fake. So the screen carries the sentence instead: what
 * is connected, what is not, and that wiring either up belongs to the dev
 * team's phase.
 *
 * Disconnect goes for the same reason and one more: it would appear to revoke
 * a credential, and there is no credential. An action that claims to have
 * withdrawn access it never had is worse than one that claims to have granted
 * it.
 *
 * ===========================================================================
 * THE TWO UNCONNECTED ROWS ARE THE POINT
 * ===========================================================================
 * Signature and payments are marked unavailable, each with a sentence saying
 * what that means for the screens a reader has already seen — a document at
 * "needs signature" is a status here rather than a request somebody was sent,
 * and a fee statement records what is owed rather than taking money. Both
 * match what those screens already say. An integrations page that showed
 * everything green would quietly contradict them.
 *
 * ===========================================================================
 * WHAT THE STITCH EXPORT PUT HERE
 * ===========================================================================
 *   · AN ESCROW ACCOUNT — "•••• Stripe Connect (AED/USD Primary Escrow)" with
 *     a "Live Payouts" badge. The fourteenth escrow request across this
 *     project and the most consequential: it says client money is moving
 *     through a facility the firm would be legally answerable for.
 *   · MASKED CREDENTIALS — "API Account: ••••-9821". Masking does not make a
 *     fabricated credential safe; it makes it unfalsifiable. A reader is being
 *     told an account was provisioned and a key issued. Neither happened.
 *   · A COMPLIANCE FOOTER — "credentials and tokens are encrypted with
 *     hardware-isolated HSM keys (SOC 2 Type II & ISO 27001 compliant). OAuth
 *     scopes are limited strictly to authenticated firm matters." Four
 *     security claims in two sentences, on the screen where somebody goes to
 *     find out what protections are on.
 *   · NAMED COMMERCIAL PRODUCTS AS FACT — "DocuSign Business Pro",
 *     "Zoom Pro", "altamimi-corp", "tenant.adgm". Provider names are fine as
 *     labels for what a category could talk to; a named paid tier with a
 *     workspace handle is an assertion the firm holds that subscription.
 *   · "Cluster: UAE-Central-01" in the header — infrastructure that does not
 *     exist, presented as an operational fact.
 *   · A mail account at `altamimi.com` — a real firm, and not this tenant.
 *     The Arabic export names رم وشركاه in the sidebar while the English names
 *     Al-Tamimi & Partners: two different firms in one screen pair.
 *   · A FIVE-TAB SUB-NAV — Firm Profile, Team & Roles, Billing & Rates,
 *     Integrations, Security & Audit — which is not this product's Settings.
 *   · {{CLIENT_LOGO}} rendered literally, for the eighth export running, and a
 *     timer on "MAT-2201 · Apollo Logistics M&A" in English against
 *     "MAT-2201 · مجموعة الخليج القابضة" in Arabic. Same reference, two
 *     different matters.
 *
 * ===========================================================================
 * PARTNERS ONLY
 * ===========================================================================
 * Connecting the firm's mail and calendar is an act on behalf of the whole
 * practice rather than work on a file. See tabs.ts.
 */

export const dynamic = 'force-dynamic';

const CATEGORY_ICONS: Record<IntegrationCategory, typeof Plug> = {
  mail: CalendarCheck,
  meetings: Video,
  // A government portal, not a product: a landmark rather than a logo.
  government: Landmark,
  signature: PenLine,
  payments: CreditCard,
};

export default async function IntegrationsSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  // The gate runs before the query. A hidden tab is not a permission.
  if (!settingsTabAllows(me.rank, 'integrations')) {
    const tRank = await getTranslations('ranks');
    return (
      <SettingsNotPermitted
        icon={Plug}
        rank={me.rank}
        tab="integrations"
        // The BARE category, not `holder` — it lands inside a sentence.
        rankLabel={tRank(me.rank)}
      />
    );
  }

  const summary = await mockApi.staff.integrations();

  return <Integrations locale={locale as Locale} rank={me.rank} summary={summary} />;
}

function Integrations({
  locale,
  rank,
  summary,
}: {
  locale: Locale;
  rank: Rank;
  summary: IntegrationSummary;
}) {
  const t = useTranslations('staffSettings.integrations');

  return (
    <SettingsShell rank={rank} active="integrations">
      {/*
        What "connected" means on this screen, before any badge is read. The
        badge alone would imply a live token; this says it is the state the
        demo starts in and names whose phase the real thing is.
      */}
      <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
        <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
        <div className="min-w-0">
          <p className="text-caption font-medium text-gray-700">{t('notice.heading')}</p>
          <p className="mt-1 text-caption text-gray-600">{t('notice.body')}</p>
          <p className="mt-2 text-caption text-gray-600">{t('notice.noControls')}</p>
        </div>
      </div>

      {/* Dedicated On-Premises Self-Hosted Document Server Integration */}
      <OnlyOfficeSettingsCard locale={locale} />

      <p className="text-caption text-gray-500">
        {/* Counted from the rows below, never a headline with its own number. */}
        {t('count', { connected: summary.connected, total: summary.total })}
      </p>

      <ul className="flex flex-col gap-4">
        {summary.items.map((record) => (
          <li key={record.category}>
            <Row record={record} locale={locale} t={t} />
          </li>
        ))}
      </ul>
    </SettingsShell>
  );
}

function Row({
  record,
  locale,
  t,
}: {
  record: IntegrationRecord;
  locale: Locale;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const Icon = CATEGORY_ICONS[record.category];
  const connected = record.providers.some((provider) => provider.connected);

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card border border-gray-200 bg-gray-50 text-legal-navy">
            <Icon aria-hidden size={17} />
          </span>
          <div className="min-w-0">
            <h2 className="font-sans text-title text-gray-900">
              {t(`categories.${record.category}.name`)}
            </h2>
            <p className="mt-0.5 text-caption text-gray-600">
              {t(`categories.${record.category}.detail`)}
            </p>
          </div>
        </div>

        <Badge tone={connected ? 'success' : 'neutral'}>
          {connected ? t('connected') : t('notConnected')}
        </Badge>
      </div>

      {/* The providers a category can use. A product name is Latin in both
          locales, so each is isolated rather than left to reorder. */}
      {record.providers.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {record.providers.map((provider) => (
            <li
              key={provider.id}
              className="flex items-center gap-2 rounded-pill border border-gray-200 bg-gray-50 px-3 py-1.5"
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  provider.connected ? 'bg-success' : 'bg-gray-300'
                }`}
              />
              <span dir="ltr" className="text-caption text-gray-700">
                {provider.name}
              </span>
              <span className="text-caption text-gray-500">
                {provider.connected ? t('providerOn') : t('providerOff')}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {record.account !== null ? (
        <p className="mt-3 text-caption text-gray-500">
          {t('account')}{' '}
          {/* The firm's own address at its own domain — not a credential. */}
          <span dir="ltr" className="font-mono text-reference text-gray-700">
            {record.account}
          </span>
        </p>
      ) : null}

      {/* Why a category is off, and what that means for screens already built. */}
      {record.unavailable !== null ? (
        <p className="mt-3 rounded-card border border-dashed border-gray-300 bg-gray-50 p-3 text-caption text-gray-600">
          <bdi>{record.unavailable[locale]}</bdi>
        </p>
      ) : null}
    </Card>
  );
}
