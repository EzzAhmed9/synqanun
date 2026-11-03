import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { SplitAuthShell, TenantAuthCard } from '@/components/auth/SplitAuthShell';
import { TenantMark } from '@/components/brand/TenantMark';
import { buttonClasses } from '@/components/ui';
import { SPLASH_SKIP_SCRIPT } from '@/components/auth/splash-session';
import { TenantSplash } from '@/components/auth/TenantSplash';
import { demoFirm, firmName, isThemedTenant } from '@/fixtures/firm';
import type { Locale } from '@/lib/i18n/routing';
import { Logo } from '@/components/brand/Logo';
import { PoweredBy } from '@/components/brand/PoweredBy';
import { FEATHER } from '@/components/brand/assets';
import { LanguageToggle } from '@/components/chrome/LanguageToggle';
import { APP_VERSION } from '@/lib/app-meta';
import { Link } from '@/lib/i18n/navigation';

/**
 * Splash screen — the application's entry point at `/`.
 *
 * Owns its own header, centred main and footer. The (auth) layout supplies
 * only the gray-50 canvas: see the note in layout.tsx on why the shared frame
 * is thin, and why this screen's centred composition is NOT the shape the
 * Gateways want.
 *
 * Built from the Stitch export as a layout reference. Three things in that
 * export were deliberately not carried over, each because it contradicts a
 * brand rule:
 *
 *   1. THE AMBIENT GRADIENT WASH. Stitch centres a 520px blurred circle of
 *      `from-syn-red/[0.025] to-syn-garnet/[0.015]` behind the composition.
 *      brand-guidelines.md §3.1 permits the brand gradient on "the logo and
 *      the feather motif's animated states — never as a decorative background
 *      wash". The canvas is flat gray-50.
 *
 *   2. THE DROP SHADOW ON THE FEATHER. Stitch's keyframes animate
 *      `filter: drop-shadow(0 4px 16px rgba(235,28,36,0.12))`.
 *      brand-guidelines.md §2.3: "Never crop, rotate, skew, or apply drop
 *      shadows/outer glows to any mark." design.md §6 adds "no colored
 *      shadows, no glow effects" — glow reads as gamified. This screen uses
 *      the `syn-feather-thinking` animation from globals.css: opacity and
 *      scale only.
 *
 *   3. "Protected by enterprise-grade security" AND "v2.4". The first sells
 *      within the product's own UI, against brand-guidelines.md §6's "precise
 *      over persuasive"; the second is a version this product has never had.
 *      The footer carries the credit Stitch omitted and the real version from
 *      package.json.
 */
export default async function SplashPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (isThemedTenant()) return <PortalChooser locale={locale as Locale} />;
  return <Splash locale={locale as Locale} />;
}

/**
 * Themed-tenant splash: the portal chooser from the client mockup, page 1
 * (design.md §10.2, "Split sign-in"). Two dark cards, one per gateway. The
 * accent-mode splash below is unchanged.
 *
 * Both cards' links take the primary style, against design.md §4's one
 * primary per view: they are two equal answers to one question, and the
 * mockup gives them equal weight. Neither is "the" action on this screen.
 *
 * The demo entrance stays underneath, as on the accent-mode splash: neither
 * gateway's Sign in does anything, so without it the deployed demo has no way
 * in. It is still dashed and gray, so it does not read as product.
 */
function PortalChooser({ locale }: { locale: Locale }) {
  const t = useTranslations('tenantAuth.chooser');
  const firm = firmName(locale);

  const portals = [
    {
      portal: 'staff' as const,
      href: '/gateway/firm',
      title: t('staffTitle'),
      body: t('staffBody', { firm }),
      action: t('staffAction'),
    },
    {
      portal: 'client' as const,
      href: '/gateway/client',
      title: t('clientTitle'),
      body: t('clientBody', { firm }),
      action: t('clientAction'),
    },
  ];

  return (
    <>
      {/*
        The tenant splash — design.md §10.2, "Splash and loading". Plays over
        this chooser the first time it is shown in a session, then lifts off
        it. The script runs during HTML parse, before the overlay paints, and
        hides it when the splash has already played or motion is reduced.
        The logo is the gold-on-dark variant because the splash field is `ink`.
      */}
      <script dangerouslySetInnerHTML={{ __html: SPLASH_SKIP_SCRIPT }} />
      <TenantSplash lockupSrc={demoFirm.logoDark ?? '/brand/meezan/meezan-logo-gold-on-dark.svg'} />

      <SplitAuthShell locale={locale} width="wide">
        <div className="text-center">
          <h1 className="font-display text-display text-gray-700">{t('heading', { firm })}</h1>
          <p className="mt-2 text-title font-normal text-gray-600">{t('subheading')}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 tablet:grid-cols-2">
          {portals.map((p) => (
            <TenantAuthCard key={p.portal} portal={p.portal} className="text-center">
              <h2 className="mt-4 font-display text-heading text-on-dark">{p.title}</h2>
              <p className="mt-1 text-body text-white/80">{p.body}</p>
              <Link
                href={p.href}
                className={buttonClasses({
                  variant: 'primary',
                  size: 'lg',
                  fullWidth: true,
                  className: 'mt-6 border-ornament',
                })}
              >
                {p.action}
                <ArrowRight aria-hidden size={16} strokeWidth={2} className="rtl:-scale-x-100" />
              </Link>
            </TenantAuthCard>
          ))}
        </div>
      </SplitAuthShell>
    </>
  );
}

function Splash({ locale }: { locale: Locale }) {
  const t = useTranslations('splash');
  return (
    <>
      {/* design.md §12: the language toggle is persistent and never buried in
          a settings screen. With no TopBar pre-auth, this is where it lives.
          End-aligned, so top-right in English and top-left in Arabic. */}
      <header className="flex justify-end p-6">
        <LanguageToggle variant="full" />
      </header>

      {/*
        MOCK: the splash currently rests here indefinitely. The real version
        resolves the session and the tenant, then routes on — to the Client or
        Firm Gateway when there is no session, straight into the app when there
        is. Not wired while the Firm Gateway is still missing.

        Centring is permitted here: design.md §5 reserves it for empty states
        and modals, and a splash is the empty state of the whole application.
      */}
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center text-center">
          {/*
            The feather at its maximum permitted raster size.

            brand-guidelines.md §2.1 caps raster use of this mark, and the
            delivered file holds only 12×34px of artwork, so FEATHER.maxHeight
            is 34. The Stitch export asks for 64–96px, which this asset cannot
            produce without visible softening — so it renders at the ceiling
            rather than being upscaled.

            `thinking` applies the §5 pulse: opacity and scale, under 1.5s,
            disabled under prefers-reduced-motion.
          */}
          {/*
            WHOSE MARK LEADS THIS SCREEN DEPENDS ON THE TENANT — design.md
            §10.2. In accent mode this is the feather over the SynQanun
            wordmark, exactly as before, including the 44px-against-34px
            proportion the raster feather forces. In themed mode it is the
            tenant's own lockup and no SynQanun lockup appears beside it.

            "Powered by SynQanun" is unaffected either way: it sits in this
            screen's footer below, in every mode, and is not a toggle (§7.2).

            The decision lives in <TenantMark> rather than here — five screens
            make it, and five copies would be five chances to get the hierarchy
            backwards.
          */}
          <TenantMark height={44} locale={locale} />

          {/* 16px below the wordmark. Caption scale, gray-500 — design.md §3. */}
          <p className="mt-4 text-caption text-gray-500">{t('caption')}</p>
        </div>
      </main>

      <footer className="flex flex-col items-center gap-3 p-6 text-caption text-gray-500 tablet:flex-row tablet:justify-between">
        <span className="inline-flex items-center gap-2">
          {/* Static, not pulsing. brand-guidelines.md §5 makes the feather the
              product's single "something is alive" signal; a second pulsing
              element competes with it for that meaning. */}
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-pill bg-action" />
          {t('descriptor')}
        </span>

        <span className="inline-flex items-center gap-2">
          {/* Required on the login/splash screen in every tenant, permanently
              — brand-guidelines.md §7.2, design.md §10. */}
          <PoweredBy />
          <span aria-hidden className="text-gray-300">
            ·
          </span>
          {/*
            `dir="ltr"` + `unicode-bidi: isolate` is not cosmetic. "v0.1.0" is
            a Latin run inside an Arabic paragraph; without isolation the bidi
            algorithm reorders it and the "v" detaches from the digits.
            design.md §12: mixed-direction content "should isolate the embedded
            run's direction rather than let it drag the surrounding text's
            alignment".
          */}
          <span dir="ltr" className="font-mono text-caption [unicode-bidi:isolate]">
            v{APP_VERSION}
          </span>
        </span>
      </footer>
    </>
  );
}
