'use client';

import * as React from 'react';
import { Info, Upload } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { FeatherMark } from '@/components/brand/FeatherMark';
import { PoweredBy } from '@/components/brand/PoweredBy';
import { useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { WizardShell } from '@/components/onboarding/WizardShell';
import { Card, Field, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * Step 1 — firm identity and brand marks.
 *
 * Deviations from the Stitch export, beyond the ones recorded in the layout:
 *
 *  · THE PRE-FILLED FIRM NAME. The export ships "Al-Tamimi & Partners" as the
 *    input's value — a real, existing law firm, and not this demo's tenant.
 *    Putting a third party's name in a product screenshot is not ours to do.
 *    The field starts empty, and the preview shows a placeholder until
 *    something is typed.
 *
 *  · "✓ Domain is reserved and SSL verified", shown against a subdomain that
 *    has been neither reserved nor verified. Replaced with a live availability
 *    check against a small MOCK list, which can actually say no.
 *
 *  · The accent swatch labelled "Maritime Royal (Corporate)". Invented colour
 *    naming; the swatches are unlabelled and the chosen value is shown as its
 *    hex, in mono, which is what a firm's brand guardian will recognise.
 */
export default function BrandingStep() {
  const t = useTranslations('onboarding.branding');
  const { branding, setBranding } = useOnboarding();

  return (
    <WizardShell step="branding" title={t('title')}>
      <div className="grid grid-cols-1 gap-6 desktop:grid-cols-12">
        <div className="desktop:col-span-7">
          <Card padding="lg">
            <h2 className="text-title text-gray-700">{t('cardTitle')}</h2>
            <p className="mt-1 text-caption text-gray-500">{t('cardBody')}</p>

            {/* No <form>: there is nothing to submit. The wizard advances
                through the footer's Continue button, so there is no way for a
                stray Enter key to trigger a full-page GET and put the firm's
                details in the query string. */}
            <div className="mt-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <Field htmlFor="firm-name" label={t('firmName')} hint={t('firmNameHint')}>
                  <Input
                    id="firm-name"
                    value={branding.firmName}
                    onChange={(e) => setBranding({ firmName: e.target.value })}
                    placeholder={t('firmNamePlaceholder')}
                  />
                </Field>

                <SubdomainField />
              </div>

              <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                <LogoField
                  id="logo-light"
                  label={t('logoLight')}
                  fileName={branding.logoLightName}
                  onPick={(name) => setBranding({ logoLightName: name })}
                />
                <LogoField
                  id="logo-dark"
                  label={t('logoDark')}
                  fileName={branding.logoDarkName}
                  onPick={(name) => setBranding({ logoDarkName: name })}
                />
              </div>

              <AccentPicker />
            </div>
          </Card>
        </div>

        <div className="desktop:col-span-5">
          <SidebarPreview />
        </div>
      </div>
    </WizardShell>
  );
}

/* -------------------------------------------------------------------------- */

// MOCK: replace with a real availability check against the tenants table.
// Track A.5. Case-insensitive, and the list is deliberately short — the point
// is that the control can say no, not that it is accurate.
const TAKEN_SUBDOMAINS = ['app', 'admin', 'demo', 'synqanun', 'mrpartners'];

function SubdomainField() {
  const t = useTranslations('onboarding.branding');
  const { branding, setBranding } = useOnboarding();

  const value = branding.subdomain.trim().toLowerCase();
  const taken = value.length > 0 && TAKEN_SUBDOMAINS.includes(value);

  return (
    <Field
      htmlFor="firm-subdomain"
      label={t('subdomain')}
      hint={t('subdomainHint')}
      error={taken ? t('subdomainTaken') : undefined}
    >
      {/*
        dir="ltr" on the wrapper. The value and the ".synqanun.com" suffix are
        one continuous Latin address; letting the RTL paragraph direction order
        them would put the suffix on the wrong side of what the user types.
      */}
      <div className="flex items-stretch" dir="ltr">
        <Input
          id="firm-subdomain"
          value={branding.subdomain}
          onChange={(e) => setBranding({ subdomain: e.target.value })}
          placeholder={t('subdomainPlaceholder')}
          invalid={taken}
          latinValue
          className="rounded-e-none border-e-0"
        />
        <span className="inline-flex shrink-0 items-center rounded-e-btn border border-gray-200 bg-gray-100 px-3 font-mono text-reference text-gray-500">
          .synqanun.com
        </span>
      </div>
    </Field>
  );
}

function LogoField({
  id,
  label,
  fileName,
  onPick,
}: {
  id: string;
  label: string;
  fileName: string | null;
  onPick: (name: string | null) => void;
}) {
  const t = useTranslations('onboarding.branding');
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-gray-700">{label}</span>

      <div className="flex flex-col items-start gap-2 rounded-card border border-dashed border-gray-300 bg-gray-50 p-4">
        <span className="text-caption text-gray-500">{fileName ?? t('noFile')}</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-btn border border-gray-200 bg-white px-3 py-1.5 text-caption font-medium text-gray-700 hover:bg-gray-100"
        >
          <Upload aria-hidden size={14} />
          {fileName ? t('replaceFile') : t('chooseFile')}
        </button>
      </div>

      <span className="text-caption text-gray-500">{t('logoHint')}</span>

      {/*
        MOCK: the file is never read or uploaded — only its name is kept, so
        the wizard can show what was chosen. Track A.5 stores it against the
        tenant and serves it as {{CLIENT_LOGO_LIGHT}} / {{CLIENT_LOGO_DARK}}.
      */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/png,image/svg+xml"
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

/**
 * Accent swatches.
 *
 * design.md §10 item 4 and brand-guidelines.md §7.1 confine {{CLIENT_ACCENT}}
 * to client-portal washes and card borders. None of these is syn-red or
 * legal-navy, because §7.1 forbids the client accent from appearing anywhere
 * those already do — the export's palette included a navy close enough to
 * collide with the AI surface colour.
 */
const ACCENT_SWATCHES = ['#0A2540', '#2C3E50', '#3D5A45', '#5B4636', '#6B2D3C', '#4A4458'];

function AccentPicker() {
  const t = useTranslations('onboarding.branding');
  const { branding, setBranding } = useOnboarding();

  return (
    <div>
      <span className="text-caption font-medium text-gray-700">{t('accent')}</span>
      <p className="mt-0.5 text-caption text-gray-500">{t('accentHint')}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setBranding({ accent: null })}
          aria-pressed={branding.accent === null}
          className={cn(
            'h-8 rounded-btn border px-3 text-caption',
            branding.accent === null
              ? 'border-gray-700 text-gray-700'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          )}
        >
          {t('accentNone')}
        </button>

        {ACCENT_SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => setBranding({ accent: hex })}
            aria-pressed={branding.accent === hex}
            aria-label={hex}
            className={cn(
              'h-8 w-8 rounded-pill border-2',
              branding.accent === hex ? 'border-gray-700' : 'border-transparent'
            )}
            style={{ backgroundColor: hex }}
          />
        ))}

        {branding.accent ? (
          <span
            dir="ltr"
            className="rounded-sm bg-gray-100 px-2 py-0.5 font-mono text-caption text-gray-700 [unicode-bidi:isolate]"
          >
            {branding.accent}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Live preview of the tenant's sidebar slot.
 *
 * Shows what design.md §10 item 2 actually permits: a small client logo beside
 * the SynQanun mark, never larger than it. The feather and the "Powered by"
 * credit are rendered from the real components, so the preview cannot drift
 * from what the product does.
 */
function SidebarPreview() {
  const t = useTranslations('onboarding.branding');
  const locale = useLocale();
  const { branding } = useOnboarding();

  const shownName = branding.firmName.trim() || t('previewPlaceholderName');
  const shownDomain = `${branding.subdomain.trim() || 'your-firm'}.synqanun.com`;

  return (
    <Card padding="lg">
      <h2 className="text-title text-gray-700">{t('previewTitle')}</h2>
      <p className="mt-1 text-caption text-gray-500">{t('previewBody')}</p>

      <div className="mt-4 rounded-card border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
          <FeatherMark height={22} />
          <span aria-hidden className="h-5 w-px shrink-0 bg-gray-200" />
          <span className="min-w-0">
            <span className="block truncate text-caption font-medium text-gray-700">
              {shownName}
            </span>
            <span
              dir="ltr"
              className="block truncate font-mono text-caption text-gray-500 [unicode-bidi:isolate]"
            >
              {shownDomain}
            </span>
          </span>
        </div>

        {/* Accent shown where §10 actually allows it: as a card border wash,
            never on a button or an AI surface. */}
        <div
          className="mt-3 rounded-sm border bg-gray-50 p-2.5 text-caption text-gray-600"
          style={{ borderColor: branding.accent ?? '#DFDFE3' }}
          lang={locale}
        >
          {t('whiteLabelNote')}
        </div>

        <div className="mt-3 flex items-center justify-center border-t border-gray-200 pt-3">
          <PoweredBy />
        </div>
      </div>

      <p className="mt-3 inline-flex items-start gap-2 text-caption text-legal-navy">
        <Info aria-hidden size={14} className="mt-0.5 shrink-0" />
        {t('accentHint')}
      </p>
    </Card>
  );
}
