import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { TenantFooter, AuthHeader } from '@/components/chrome';
import { demoFirm, firmName } from '@/fixtures/firm';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Shell for the client password reset flow.
 *
 * All three states — request, check-your-email, set-new-password — carry the
 * identical tenant header and footer, differing only in the main content. Three
 * instances of the same chrome, so it is a layout rather than three copies.
 *
 * It provides chrome ONLY. The three states do not share a content shape:
 * states 1 and 3 are split panel + card at a wide measure, state 2 is a single
 * narrow centred card. Each page owns its own <main>, for the same reason the
 * (auth) layout stayed thin after the Client Gateway — see that file's note.
 */
export default async function ResetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResetChrome locale={locale as Locale}>{children}</ResetChrome>;
}

function ResetChrome({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = useTranslations('passwordReset');

  return (
    <>
      {/* No {{CLIENT_LOGO}} slot, consistent with the Client Gateway and
          Accept Invite. The tenant is named, not branded. */}
      <AuthHeader
        firmName={firmName(locale)}
        tagline={demoFirm.tagline[locale]}
        context={t('headerContext')}
        status={t('portalStatus')}
        helpdeskLabel={t('helpdesk')}
      />

      {children}

      <TenantFooter firmName={firmName(locale)} copyright={t('copyright')} />
    </>
  );
}
