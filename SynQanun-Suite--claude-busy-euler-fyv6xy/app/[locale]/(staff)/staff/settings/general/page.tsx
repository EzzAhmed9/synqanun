import { Building2, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge, Card } from '@/components/ui';
import { demoFirm } from '@/fixtures/firm';
import { formatCalendarDate, tenantZoneOffset } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type RosterMember } from '@/lib/mock-api';
import type { Rank } from '@/lib/ranks';
import { SettingsNotPermitted, SettingsShell } from '../SettingsShell';
import { settingsTabAllows } from '../tabs';

/**
 * Settings → General & profile — BUILD_PLAN.md §3, Batch 6.
 *
 * ===========================================================================
 * IT READS. NOTHING HERE SAVES, AND THAT IS A DECISION RATHER THAN A GAP
 * ===========================================================================
 * §5.1 would let this screen write: a firm's own name and a person's own
 * profile are records inside the workspace, category one. It does not, and the
 * reason is that there is nothing coherent to write to.
 *
 *   · THE FIRM'S IDENTITY IS TENANT CONFIGURATION, not firm data.
 *     fixtures/firm.ts says so at the top: "In production these come from the
 *     tenant-configuration layer, never from a checked-in file." A Save button
 *     here would write to a file that production does not have.
 *   · A PERSON'S RANK IS NOT SELF-EDITABLE. It decides what they can see, and
 *     Team & Roster is where a partner sets it — a profile screen that let
 *     someone promote themselves would be the access-control bug, not a
 *     convenience.
 *   · A PERSON'S NAME AND EMAIL ARE IDENTITY. Changing the address you sign in
 *     with needs the authentication Track A does not have (BUILD_PLAN §6).
 *
 * So the screen shows what this workspace IS, says where each value comes
 * from, and offers no inert Save. design.md's rule against controls that do
 * nothing is better served by not drawing them.
 *
 * ===========================================================================
 * THE LANGUAGE TOGGLE IS NOT HERE, ON PURPOSE
 * ===========================================================================
 * design.md §12: the language toggle "lives in the top nav, persistent, never
 * buried in a settings screen". The client portal's Settings already refuses
 * to bury it — see ProfilePanel.tsx — and this screen keeps the same rule and
 * points at where it actually is, rather than silently omitting it.
 *
 * ===========================================================================
 * NO SECURITY CLAIMS
 * ===========================================================================
 * The Stitch exports attach one to every screen they touch, and the Add Client
 * export attaches three to a form: "AES-256 Vault Initialized", "AML & KYC
 * Tier-1", "Dual-Factor Hardware Token & Passkey enforced". There is no vault,
 * no screening and no second factor. A settings screen is where somebody looks
 * to find out what protections are on, which makes a false one here worse than
 * the same claim anywhere else.
 */

export const dynamic = 'force-dynamic';

export default async function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  if (!settingsTabAllows(me.rank, 'general')) {
    const tRank = await getTranslations('ranks');
    return (
      <SettingsNotPermitted
        icon={Building2}
        rank={me.rank}
        tab="general"
        rankLabel={tRank(me.rank)}
      />
    );
  }

  // The roster row rather than the bare staff record: it carries the joined
  // date and the account status, already derived, so this screen does not
  // compute a second version of either.
  const roster = await mockApi.staff.roster();
  const mine = roster.items.find((row) => row.id === me.id) ?? null;

  return <General locale={locale as Locale} rank={me.rank} me={mine} />;
}

function General({
  locale,
  rank,
  me,
}: {
  locale: Locale;
  rank: Rank;
  me: RosterMember | null;
}) {
  const t = useTranslations('staffSettings.general');
  const tRank = useTranslations('ranks');

  return (
    <SettingsShell rank={rank} active="general">
      {/* Why there is no Save. Said once, at the top, rather than as five
          disabled buttons further down. */}
      <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
        <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
        <div className="min-w-0">
          <p className="text-caption font-medium text-gray-700">{t('readOnly.heading')}</p>
          <p className="mt-1 text-caption text-gray-600">{t('readOnly.body')}</p>
        </div>
      </div>

      {/* Your account ------------------------------------------------- */}
      <Card padding="lg">
        <h2 className="font-sans text-title text-gray-900">{t('account.heading')}</h2>
        <p className="mt-1 text-caption text-gray-500">{t('account.caption')}</p>

        <dl className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
          {me === null ? (
            <Row label={t('account.name')}>{t('account.missing')}</Row>
          ) : (
            <>
              <Row label={t('account.name')}>
                <bdi>{me.name[locale]}</bdi>
              </Row>
              <Row label={t('account.email')}>
                {/* Latin in both locales. */}
                <span dir="ltr" className="font-mono text-reference">
                  {me.email}
                </span>
              </Row>
              <Row label={t('account.rank')}>
                <span className="block">{tRank(`holder.${me.rank}`)}</span>
                <span className="mt-0.5 block text-caption text-gray-500">
                  {t('account.rankSetBy')}
                </span>
              </Row>
              <Row label={t('account.status')}>
                {/* The same tones the roster uses, so one person's status
                    does not read differently on two screens. */}
                <Badge
                  tone={
                    me.status === 'active'
                      ? 'success'
                      : me.status === 'temporaryPasswordIssued'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {t(`status.${me.status}`)}
                </Badge>
              </Row>
              <Row label={t('account.joined')}>
                <span className="[unicode-bidi:isolate]">
                  {formatCalendarDate(me.joinedOn, locale, { month: 'long' })}
                </span>
              </Row>
            </>
          )}
        </dl>
      </Card>

      {/* This workspace ------------------------------------------------ */}
      <Card padding="lg">
        <h2 className="font-sans text-title text-gray-900">{t('firm.heading')}</h2>
        <p className="mt-1 text-caption text-gray-500">{t('firm.caption')}</p>

        <dl className="mt-4 divide-y divide-gray-200 border-t border-gray-200">
          <Row label={t('firm.name')}>
            {/*
              Both locales at once, because this is the field itself rather
              than a rendering of it — a partner checking how the firm's name
              appears to an Arabic client needs to see the Arabic.
            */}
            <span className="block">
              <bdi>{demoFirm.name.en}</bdi>
            </span>
            <span className="mt-0.5 block text-caption text-gray-500">
              <bdi>{demoFirm.name.ar}</bdi>
            </span>
          </Row>

          <Row label={t('firm.domain')}>
            <span dir="ltr" className="font-mono text-reference">
              {demoFirm.domain}
            </span>
            <span className="mt-0.5 block text-caption text-gray-500">
              {t('firm.domainNote')}
            </span>
          </Row>

          <Row label={t('firm.timeZone')}>
            {/* Derived from Intl every render, never written down — Cairo is
                GMT+2 in winter and GMT+3 in summer. See lib/format.ts. */}
            <span className="[unicode-bidi:isolate]">{tenantZoneOffset(locale)}</span>
            <span className="mt-0.5 block text-caption text-gray-500">
              {t('firm.timeZoneNote')}
            </span>
          </Row>

          <Row label={t('firm.language')}>
            <span className="block">{t('firm.languageValue')}</span>
            {/* design.md §12. Points at the toggle instead of duplicating it. */}
            <span className="mt-0.5 block text-caption text-gray-500">
              {t('firm.languageNote')}
            </span>
          </Row>

          <Row label={t('firm.branding')}>
            <span className="block">
              {demoFirm.logoLight === null ? t('firm.noLogo') : t('firm.hasLogo')}
            </span>
            <span className="mt-0.5 block text-caption text-gray-500">
              {demoFirm.accent === null ? t('firm.noAccent') : t('firm.hasAccent')}
            </span>
          </Row>
        </dl>
      </Card>
    </SettingsShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 tablet:flex-row tablet:items-start tablet:justify-between tablet:gap-6">
      <dt className="text-caption text-gray-500 tablet:w-56 tablet:shrink-0">{label}</dt>
      <dd className="min-w-0 flex-1 text-body text-gray-700">{children}</dd>
    </div>
  );
}
