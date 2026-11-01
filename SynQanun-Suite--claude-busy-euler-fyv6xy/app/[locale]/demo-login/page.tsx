import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { TenantMark } from '@/components/brand/TenantMark';
import type { Locale } from '@/lib/i18n/routing';
import { Logo } from '@/components/brand/Logo';
import { PoweredBy } from '@/components/brand/PoweredBy';
import { FEATHER } from '@/components/brand/assets';
import { LanguageToggle } from '@/components/chrome/LanguageToggle';
import { Card } from '@/components/ui';
import { APP_VERSION } from '@/lib/app-meta';
import { routing } from '@/lib/i18n/routing';
import { UnlockForm } from './UnlockForm';

/**
 * The deployment's front door.
 *
 * ===========================================================================
 * IT LOOKS LIKE THE PRODUCT BECAUSE IT IS THE FIRST THING ANYBODY SEES
 * ===========================================================================
 * A bare unstyled password box would be the first impression of a build whose
 * entire point is that it is designed. So this borrows the splash's frame — the
 * gray-50 canvas, the centred column, the feather and wordmark, the footer with
 * the credit and version — and drops a card into it.
 *
 * It is bilingual like every other screen, with the language toggle in the same
 * place, because the person being shown this demo may well be reading in
 * Arabic and the gate is not the place to make them switch.
 *
 * ===========================================================================
 * IT SAYS WHAT IT IS
 * ===========================================================================
 * The notice is not decoration. Somebody arriving at a password prompt on a
 * legal-sector URL should know within one sentence that this is a prototype
 * behind a shared demo password, not a client portal they are expected to have
 * an account for — and that the records inside are invented. The alternative is
 * a stranger concluding they have found a real firm's workspace and failed to
 * log in, which is the exact impression the gate exists to prevent.
 *
 * ===========================================================================
 * `next`, AND WHY IT IS SANITISED HERE TOO
 * ===========================================================================
 * The middleware only ever writes a path into it, but a visitor can type
 * whatever they like into the address bar, and this value ends up in
 * `window.location.assign`. A value starting `//` or naming a scheme would send
 * somebody to another origin immediately after they typed a password, which is
 * the classic open-redirect shape. So it is accepted only when it is a single
 * leading slash followed by something that is not another slash — and falls
 * back to the locale root otherwise.
 */

export const dynamic = 'force-dynamic';

/** A same-origin path, or the locale's root. Never another origin. */
function safeNext(raw: string | undefined, locale: string): string {
  if (!raw) return `/${locale}`;
  if (!raw.startsWith('/') || raw.startsWith('//')) return `/${locale}`;
  // A backslash is treated as a slash by some browsers when resolving URLs.
  if (raw.includes('\\')) return `/${locale}`;
  return raw;
}

export default async function DemoLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const resolved = routing.locales.includes(locale as never) ? locale : routing.defaultLocale;

  return <DemoLogin next={safeNext(query.next, resolved)} locale={resolved as Locale} />;
}

function DemoLogin({ next, locale }: { next: string; locale: Locale }) {
  const t = useTranslations('demoLogin');

  return (
    <>
      {/* design.md §12: the toggle is persistent and never buried. Same place
          as the splash, because this screen stands in front of it. */}
      <header className="flex justify-end p-6">
        <LanguageToggle variant="full" />
      </header>

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center text-center">
          {/* Static, not pulsing: brand-guidelines.md §5 reserves the animation
              for "the AI is actively working", and a locked door is not that. */}
          {/* Whose mark leads — design.md §10.2. See <TenantMark>. */}
          <TenantMark height={44} locale={locale} />
        </div>

        <Card padding="lg" className="mt-8 w-full max-w-[26rem]">
          <h1 className="font-display text-heading text-gray-700">{t('heading')}</h1>
          <p className="mt-1 text-caption text-gray-500">{t('subheading')}</p>

          <UnlockForm next={next} />

          {/*
            Said on the door rather than inside, because the person who most
            needs it is the one who does not have the password and is trying to
            work out what they have found.
          */}
          <div className="mt-6 flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-4">
            <Info aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-500" />
            <div className="min-w-0 text-start">
              <p className="text-caption font-medium text-gray-700">{t('notice.heading')}</p>
              <p className="mt-1 text-caption text-gray-600">{t('notice.body')}</p>
            </div>
          </div>
        </Card>
      </main>

      <footer className="flex flex-col items-center gap-3 p-6 text-caption text-gray-500 tablet:flex-row tablet:justify-between">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-pill bg-action" />
          {t('descriptor')}
        </span>

        <span className="inline-flex items-center gap-2">
          {/* Required in every instance, permanently — brand-guidelines.md §7.2. */}
          <PoweredBy />
          <span aria-hidden className="text-gray-300">
            ·
          </span>
          {/* Latin run, isolated so the "v" does not detach inside Arabic. */}
          <span dir="ltr" className="font-mono text-caption [unicode-bidi:isolate]">
            v{APP_VERSION}
          </span>
        </span>
      </footer>
    </>
  );
}
