import { FileText, FolderOpen, MessageSquare, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { TenantFooter } from '@/components/chrome/TenantFooter';
import { AuthHeader } from '@/components/chrome/AuthHeader';
import { Card, CardContent, CardTitle } from '@/components/ui';
import { SplitAuthShell, TenantAuthCard } from '@/components/auth/SplitAuthShell';
import { TenantSignInForm } from '@/components/auth/TenantSignInForm';
import { demoFirm, firmAccent, firmName, isThemedTenant } from '@/fixtures/firm';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { ClientSignInForm } from './ClientSignInForm';

/**
 * Client Gateway — the client portal's sign-in screen.
 *
 * Structurally unrelated to Splash: a firm-identity header bar, a wide
 * top-aligned 7/5 grid, and a footer pairing the tenant's copyright with the
 * SynQanun credit. See the note in ../../layout.tsx on why the shared (auth)
 * frame is only the canvas.
 *
 * This is the one screen in the product where the tenant is visually dominant.
 * brand-guidelines.md §7.1 scopes client branding to four places, and the
 * login screen is the first of them. Everything the client controls here is
 * read from fixtures/firm.ts — nothing about "MR and Partners" is typed into
 * this file.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE NAVY HEADER STRIPE. Stitch renders
 *    `bg-gradient-to-r from-gray-700 via-legal-navy to-gray-800`. design.md §10
 *    does sanction a client-portal "header background stripe", but as the slot
 *    for {{CLIENT_ACCENT}} — and brand-guidelines.md §7.1 says that accent
 *    "must never be used on primary buttons, AI-agent surfaces, or anywhere
 *    syn-red or legal-navy currently appear." A navy stripe puts the client's
 *    accent slot in the AI's colour. The stripe now takes firmAccent(), which
 *    falls back to gray-200 when the tenant has no brand colour (§7.3).
 *
 *  · THE EMERALD PALETTE. Stitch introduces emerald-600/50/200 for the portal
 *    status indicator. There is no emerald in design.md §2 — the token for
 *    "this is fine" is `success` (#1E7A4C). globals.css clears Tailwind's
 *    stock palette precisely so this kind of drift fails to compile.
 *
 *  · "TLS 1.3 256-bit", "SOC2 Type II", "Protected by hardware token security
 *    and tenant audit logs", "Single-tenant encrypted instance". These assert
 *    specific cryptographic configuration and a named compliance
 *    certification. Track A has no authentication at all, and SOC 2 Type II is
 *    a real audited attestation — putting it on a screen a prospective client
 *    will be shown is a claim the product cannot currently back.
 *    brand-guidelines.md §6: "Precise over persuasive… it doesn't sell within
 *    its own UI." The honest reassurance that remains is the portal-channel
 *    indicator and a line telling the client who to contact.
 *
 *  · THE ALL-CAPS EYEBROWS. "SECURE LOGIN" and "INSTITUTIONAL COUNSEL" are
 *    set `uppercase tracking-wider`. design.md §3 and §7 both forbid this by
 *    name — "no tracked-out all-caps eyebrows (a common generic-AI-UI tell;
 *    explicitly avoid it)". Sentence case throughout.
 */
export default async function ClientGatewayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isThemedTenant()) return <ThemedClientGateway locale={locale as Locale} />;
  return <ClientGateway locale={locale as Locale} />;
}

/**
 * Themed-tenant variant — the split sign-in from the client mockup
 * (design.md §10.2, "Split sign-in"). The accent-mode screen below is
 * untouched and is still what every unthemed tenant gets.
 */
function ThemedClientGateway({ locale }: { locale: Locale }) {
  const t = useTranslations('tenantAuth.client');
  const firm = firmName(locale);

  return (
    <SplitAuthShell locale={locale} showBack>
      <TenantAuthCard portal="client">
        <h1 className="mt-4 text-center font-display text-heading text-on-dark">{t('heading')}</h1>
        <p className="mt-1 text-center text-body text-white/80">{t('subtitle')}</p>
        <TenantSignInForm portal="client" />
        <p className="mt-4 text-center text-caption text-white/80">{t('note', { firm })}</p>
      </TenantAuthCard>
    </SplitAuthShell>
  );
}

function ClientGateway({ locale }: { locale: Locale }) {
  const t = useTranslations('clientGateway');
  const tServices = useTranslations('clientGateway.services');

  const services = [
    { icon: FileText, title: tServices('mattersTitle'), body: tServices('mattersBody') },
    { icon: FolderOpen, title: tServices('documentsTitle'), body: tServices('documentsBody') },
    { icon: Receipt, title: tServices('invoicesTitle'), body: tServices('invoicesBody') },
    { icon: MessageSquare, title: tServices('messagesTitle'), body: tServices('messagesBody') },
  ];

  return (
    <>
      {/* Client-accent stripe — design.md §10's one sanctioned use of
          {{CLIENT_ACCENT}} in the portal chrome. gray-200 when unset. */}
      <div aria-hidden className="h-1.5 w-full shrink-0" style={{ backgroundColor: firmAccent() }} />

      {/*
        Firm name only — no {{CLIENT_LOGO}} slot, per the build instruction for
        this screen. Note for review: brand-guidelines.md §7.1 item 1 does
        permit a client logo on the login screen "displayed above or beside the
        SynQanun mark", so this is narrower than the brand system allows. It is
        moot in the demo, since demoFirm.logoLight is null — restoring the slot
        is a fixture change, not a rebuild.
      */}
      <AuthHeader
        firmName={firmName(locale)}
        tagline={demoFirm.tagline[locale]}
        context={t('headerContext')}
        status={t('portalStatus')}
        helpdeskLabel={t('helpdesk')}
      />

      {/* --- Gateway body --------------------------------------------------- */}
      <main className="mx-auto w-full max-w-content flex-1 px-6 py-10">
        {/* 12-column grid, 24px gutters — design.md §5. Top-aligned, not
            centred: this screen is content, not an empty state. */}
        <div className="grid grid-cols-1 gap-8 desktop:grid-cols-12 desktop:gap-6">
          {/* Sign-in card comes FIRST in the DOM so it is first on mobile and
              first in the tab order — it is why a client opened this page.
              `desktop:order-2` moves it to the end column on wide screens,
              which resolves to the right in English and the left in Arabic. */}
          <div className="desktop:order-2 desktop:col-span-5">
            <Card padding="lg">
              <p className="text-caption text-gray-500">{t('signInEyebrow')}</p>
              <h1 className="mt-1 font-display text-heading text-gray-700">{t('signInHeading')}</h1>
              <p className="mt-1 text-caption text-gray-500">{t('signInSubtitle')}</p>

              <ClientSignInForm />

              <p className="mt-6 border-t border-gray-200 pt-5 text-caption text-gray-500">
                {t('accessHelp')}
              </p>
            </Card>

            {/* Cross-link to the staff side.
                NOTE FOR REVIEW: the build instruction asked for "Are you a
                client? Go to the client portal", which points away from a
                client portal that the visitor is already standing in. On the
                CLIENT gateway the useful cross-link is the opposite one, so it
                is written that way here. If this screen was meant to be the
                Firm Gateway, flipping it is a one-line change.
                MOCK: /gateway/firm does not exist yet — it is the next screen. */}
            <p className="mt-4 text-center text-caption text-gray-500">
              {t('staffPrompt')}{' '}
              <Link href="/gateway/firm" className="font-medium text-legal-navy hover:underline">
                {t('staffLink')}
              </Link>
            </p>
          </div>

          {/* --- Firm's own content ---------------------------------------- */}
          <div className="flex flex-col gap-8 desktop:order-1 desktop:col-span-7">
            <Card padding="lg">
              <p className="text-caption text-gray-500">{t('aboutEyebrow')}</p>
              {/* Display scale, one per screen — design.md §3. */}
              <h2 className="mt-2 font-display text-display text-gray-700">
                {demoFirm.headline[locale]}
              </h2>
              <p className="mt-4 text-body text-gray-600">{demoFirm.about[locale]}</p>

              <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-200 pt-4">
                {demoFirm.practiceAreas[locale].map((area) => (
                  <li key={area} className="text-caption text-gray-500">
                    {area}
                  </li>
                ))}
              </ul>
            </Card>

            <section className="flex flex-col gap-4">
              <div>
                <h2 className="font-display text-heading text-gray-700">{t('introHeading')}</h2>
                <p className="mt-1 text-body text-gray-600">{t('introBody')}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2">
                {services.map(({ icon: Icon, title, body }) => (
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
            </section>
          </div>
        </div>
      </main>

      <TenantFooter firmName={firmName(locale)} copyright={t('copyright')} />
    </>
  );
}
