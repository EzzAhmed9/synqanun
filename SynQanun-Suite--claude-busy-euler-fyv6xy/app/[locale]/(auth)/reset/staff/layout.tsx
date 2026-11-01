import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { TenantFooter, StaffAuthHeader } from '@/components/chrome';
import { firmName } from '@/fixtures/firm';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Shell for the staff password reset flow.
 *
 * Mirrors the client flow's layout, with one deliberate difference:
 * <StaffAuthHeader> rather than <AuthHeader>. This is an internal surface, and
 * brand-guidelines.md §7.1 scopes client branding to four client-facing
 * locations — none of which is a staff screen. StaffAuthHeader has no prop for
 * a tenant logo or name at all, so the rule holds by construction rather than
 * by anyone remembering it.
 *
 * The footer still NAMES the firm, exactly as the Firm Gateway's does: the
 * practice system belongs to the tenant. Naming is not branding — no logo, no
 * accent, no tenant typography.
 *
 * Chrome only. The three states do not share a content shape: states 1 and 3
 * are split panel + card, state 2 is a single narrow centred card, so each
 * page owns its own <main>.
 */
export default async function StaffResetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <StaffResetChrome locale={locale as Locale}>{children}</StaffResetChrome>;
}

function StaffResetChrome({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = useTranslations('staffReset');
  const tFirm = useTranslations('firmGateway');

  return (
    <>
      <StaffAuthHeader label={t('workspaceLabel')} locale={locale as Locale} />
      {children}
      <TenantFooter firmName={firmName(locale)} copyright={tFirm('copyright')} />
    </>
  );
}
