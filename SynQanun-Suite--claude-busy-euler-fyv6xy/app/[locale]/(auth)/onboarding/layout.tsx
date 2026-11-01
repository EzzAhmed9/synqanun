import type { Locale } from '@/lib/i18n/routing';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { PoweredBy } from '@/components/brand/PoweredBy';
import { StaffAuthHeader } from '@/components/chrome';
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider';

/**
 * Firm onboarding wizard shell.
 *
 * TWO JOBS, AND THE SECOND IS THE IMPORTANT ONE
 *
 * 1. Chrome: a SynQanun-branded header and a quiet footer.
 * 2. It holds <OnboardingProvider>. A layout does not remount when navigating
 *    between its child routes, so the five steps get real URLs AND keep what
 *    has been typed when the user moves backwards. See that file's note.
 *
 * SynQanun-branded, not tenant-branded. This is administrator provisioning —
 * a staff surface — and brand-guidelines.md §7.1 scopes client branding to
 * four client-facing locations, none of which is this. That is also why the
 * wizard's own step 1 asks for the firm's logo rather than displaying it up
 * here: the tenant is being configured, it is not the host identity.
 *
 * Standalone, no application chrome — no Sidebar, no TopBar, no TimerPill.
 * There is no workspace to navigate yet; it is what this wizard creates.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · "SynQanun Enclave Security • Multi-tenant Data Isolation ISO 27001 &
 *    SOC 2 Certified • Session Hash: 4B82-ONBOARD-2025". Two named audited
 *    certifications and a fabricated session identifier, in the page footer.
 *    brand-guidelines.md §6.
 *  · The search and notifications buttons in the header. Neither does anything
 *    during provisioning, and there is nothing yet to search or be notified
 *    about.
 *  · "v4.8 Core" in the sidebar preview — a version this product has not had.
 */
export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OnboardingChrome locale={locale as Locale}>{children}</OnboardingChrome>;
}

function OnboardingChrome({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const t = useTranslations('onboarding');

  return (
    <OnboardingProvider>
      <StaffAuthHeader label={t('workspaceLabel')} locale={locale} />

      {children}

      <footer className="mt-4 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-content items-center justify-center px-6 py-5">
          {/* brand-guidelines.md §7.2 — permanent, every instance. */}
          <PoweredBy withMark />
        </div>
      </footer>
    </OnboardingProvider>
  );
}
