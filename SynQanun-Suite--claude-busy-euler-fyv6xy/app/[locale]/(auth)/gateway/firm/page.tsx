import { FileText, FolderOpen, Receipt, Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { FeatherMark } from '@/components/brand/FeatherMark';
import { FEATHER } from '@/components/brand/assets';
import { TenantFooter, StaffAuthHeader } from '@/components/chrome';
import { Card, CardContent, CardTitle } from '@/components/ui';
import { SplitAuthShell, TenantAuthCard } from '@/components/auth/SplitAuthShell';
import { TenantSignInForm } from '@/components/auth/TenantSignInForm';
import { firmName, isThemedTenant } from '@/fixtures/firm';
import { APP_VERSION } from '@/lib/app-meta';
import type { Locale } from '@/lib/i18n/routing';
import { StaffSignInForm } from './StaffSignInForm';

/**
 * Firm Gateway — the internal staff sign-in screen.
 *
 * SynQanun-branded, not tenant-branded. brand-guidelines.md §7.1 scopes a
 * client's brand to four client-facing locations; a firm's staff gateway is
 * none of them. That is why this uses <StaffAuthHeader>, which has no prop for
 * a tenant logo or name, rather than the tenant-branded <AuthHeader> the
 * Client Gateway and Accept Invite use.
 *
 * The tenant is still NAMED — in the footer's copyright line, because the
 * practice system belongs to the firm. Naming is not branding: no logo, no
 * accent colour, no tenant typography.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE {{CLIENT_LOGO}} SLOT. The export puts one at the start of the header,
 *    with the SynQanun wordmark demoted to the end. That inverts §7.1/§7.2 on
 *    the one screen where SynQanun's identity is unambiguous. The wordmark now
 *    leads and there is no client logo slot at all.
 *
 *  · "v2.4 LTS • Private Instance". The version is fabricated — the real one
 *    comes from package.json via lib/app-meta.ts. "Private Instance" is an
 *    infrastructure claim this deployment cannot make.
 *
 *  · "Single-Tenant On-Premises Isolation" and "TLS 1.3 • FIPS 140-3". Same
 *    call as the Client Gateway and Accept Invite: FIPS 140-3 is a real
 *    certification, Track A has no authentication at all, and
 *    brand-guidelines.md §6 is explicit that the product does not sell within
 *    its own UI. Removed rather than restyled.
 *
 *  · "CORE OPERATING SYSTEM MODULES" as a tracked all-caps eyebrow. design.md
 *    §3 and §7 forbid this by name — "a common generic-AI-UI tell; explicitly
 *    avoid it". Sentence case.
 *
 *  · THE DUPLICATED COPYRIGHT. The export's footer renders the tenant
 *    copyright twice, once in each half of the row. TenantFooter renders it once.
 */
export default async function FirmGatewayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isThemedTenant()) return <ThemedFirmGateway locale={locale as Locale} />;
  return <FirmGateway locale={locale as Locale} />;
}

/**
 * Themed-tenant variant — the split sign-in from the client mockup
 * (design.md §10.2, "Split sign-in"). The accent-mode screen below is
 * untouched and is still what every unthemed tenant gets.
 */
function ThemedFirmGateway({ locale }: { locale: Locale }) {
  const t = useTranslations('tenantAuth.staff');
  const firm = firmName(locale);

  return (
    <SplitAuthShell locale={locale} showBack>
      <TenantAuthCard portal="staff">
        <h1 className="mt-4 text-center font-display text-heading text-on-dark">{t('heading')}</h1>
        <p className="mt-1 text-center text-body text-white/80">{t('subtitle')}</p>
        <TenantSignInForm portal="staff" />
        <p className="mt-4 text-center text-caption text-white/80">{t('note', { firm })}</p>
      </TenantAuthCard>
    </SplitAuthShell>
  );
}

function FirmGateway({ locale }: { locale: Locale }) {
  const t = useTranslations('firmGateway');
  const tModules = useTranslations('firmGateway.modules');

  const modules = [
    { icon: FileText, title: tModules('draftingTitle'), body: tModules('draftingBody') },
    { icon: FolderOpen, title: tModules('dmsTitle'), body: tModules('dmsBody') },
    { icon: Receipt, title: tModules('billingTitle'), body: tModules('billingBody') },
    { icon: Workflow, title: tModules('workflowTitle'), body: tModules('workflowBody') },
  ];

  return (
    <>
      <StaffAuthHeader
        locale={locale}
        label={t('workspaceLabel')}
        meta={
          // Real version, isolated as a Latin run so the "v" does not detach
          // from the digits inside Arabic copy (design.md §12).
          <span
            dir="ltr"
            className="hidden rounded-sm border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-caption text-gray-600 tablet:inline-block [unicode-bidi:isolate]"
          >
            v{APP_VERSION}
          </span>
        }
      />

      <main className="mx-auto w-full max-w-content flex-1 px-6 py-10">
        <div className="grid grid-cols-1 gap-8 desktop:grid-cols-12 desktop:gap-6">
          {/* Sign-in card first in the DOM: it is the task, so it leads the tab
              order and stacks first on mobile. `desktop:order-2` moves it to
              the end column — right in English, left in Arabic. */}
          <div className="desktop:order-2 desktop:col-span-5">
            <Card padding="lg">
              <h2 className="font-display text-heading text-gray-700">{t('signInHeading')}</h2>
              <p className="mt-1 text-caption text-gray-500">{t('signInSubtitle')}</p>
              <StaffSignInForm />
            </Card>
          </div>

          {/* --- Brand panel ------------------------------------------------ */}
          <div className="flex flex-col gap-6 desktop:order-1 desktop:col-span-7">
            <div>
              <div className="flex items-center gap-3">
                {/*
                  The feather at its maximum permitted raster size.
                  brand-guidelines.md §2.1 caps raster use of the mark, and the
                  delivered file holds only 12×34px of artwork, so
                  FEATHER.maxHeight is 34. Static, not pulsing: §5 reserves the
                  animation for "the AI is actively working", and a login
                  screen is not that.
                */}
                <FeatherMark height={FEATHER.maxHeight ?? 34} priority />
                <span className="text-caption font-medium text-legal-navy">{t('eyebrow')}</span>
              </div>

              {/* Display scale, one per screen, sentence case — design.md §3. */}
              <h1 className="mt-4 font-display text-display text-gray-700">{t('heading')}</h1>
              <p className="mt-2 text-body text-gray-600">{t('subheading')}</p>
            </div>

            <div>
              {/* Sentence case, not a tracked all-caps eyebrow — design.md §7. */}
              <h2 className="mb-3 text-title text-gray-700">{t('modulesHeading')}</h2>

              <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
                {modules.map(({ icon: Icon, title, body }) => (
                  <Card key={title} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-legal-navy">
                      <Icon aria-hidden size={16} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <CardTitle className="text-body-emphasis">{title}</CardTitle>
                      <CardContent className="mt-0.5 text-caption text-gray-500">{body}</CardContent>
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <TenantFooter firmName={firmName(locale)} copyright={t('copyright')} />
    </>
  );
}
