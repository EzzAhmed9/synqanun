import { ChevronLeft, Headset, LockKeyhole, UserRound, UsersRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PoweredBy } from '@/components/brand/PoweredBy';
import { TenantMark } from '@/components/brand/TenantMark';
import { LanguageToggle } from '@/components/chrome/LanguageToggle';
import { authPanelTexture, firmName } from '@/fixtures/firm';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';
import { StonePanel } from './StonePanel';

/**
 * The split sign-in frame for a THEMED tenant — design.md §10.2, "Split
 * sign-in". The portal chooser (splash) and both gateways render inside it
 * when the tenant has a theme; in accent mode none of them use it, and they
 * render exactly what they rendered before.
 *
 * Built from the client's mockup, pages 1–3: a cream form side holding the
 * tenant lockup and a dark card, and a stone panel on the inline end.
 *
 * WHOSE BRAND, AND WHERE
 * ---------------------------------------------------------------------------
 * The tenant lockup leads, through <TenantMark>, which is the one place that
 * decides the hierarchy. SynQanun appears once, as the "Powered by SynQanun"
 * credit in this frame's footer (brand-guidelines §7.2). It is rendered
 * unconditionally, there is no prop to hide it, and the mockup's footer,
 * which omitted it, is not followed on that point.
 *
 * DIRECTION
 * ---------------------------------------------------------------------------
 * The form column is first in the DOM and the panel second, so in a flex row
 * the panel lands on the inline end: right in English, left in Arabic, which
 * is where the mockup puts it. Nothing here names a physical side.
 *
 * CONTRAST, measured on Meezan's palette
 * ---------------------------------------------------------------------------
 * Cream side: headings and links gray-700 at 10.64:1; secondary copy and the
 * footer gray-600 at 6.85:1 — not gray-500, which is only 4.00:1 on this
 * cream. Dark card: `on-dark` at 9.42:1, secondary copy white at 80%, 6.74:1.
 * Gold is used only for rules, borders and decorative icons, never for text.
 */
export function SplitAuthShell({
  locale,
  width = 'narrow',
  showBack = false,
  children,
}: {
  locale: Locale;
  /** `wide` fits the chooser's two cards side by side; `narrow` one form. */
  width?: 'narrow' | 'wide';
  /** The gateways link back to the chooser; the chooser itself does not. */
  showBack?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations('tenantAuth');
  const measure = width === 'wide' ? 'max-w-[44rem]' : 'max-w-[30rem]';

  return (
    <div className="flex flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* design.md §12: the language toggle is persistent pre-auth too.
            gray-600, because its default gray-500 is 4.00:1 on this cream. */}
        <header className="flex justify-end px-6 pt-6">
          <LanguageToggle variant="full" className="text-gray-600" />
        </header>

        <main className="flex flex-1 flex-col items-center px-4 pt-4 pb-10 tablet:px-8">
          <div className={cn('flex w-full flex-col', measure)}>
            {/* The tenant lockup — the largest mark on the screen (§10.2). */}
            <div className="flex justify-center">
              <TenantMark height={56} locale={locale} />
            </div>

            {showBack ? (
              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-1 self-start text-caption font-medium text-gray-700 hover:underline"
              >
                {/* Points to the inline start, so it flips in Arabic — §12. */}
                <ChevronLeft aria-hidden size={16} strokeWidth={2} className="rtl:rotate-180" />
                {t('back')}
              </Link>
            ) : null}

            <div className={showBack ? 'mt-3' : 'mt-10'}>{children}</div>

            {/* MOCK: the helpdesk has no destination yet — same placeholder
                AuthHeader uses. */}
            <a
              href="#helpdesk"
              className="mt-8 inline-flex items-center gap-1.5 self-center text-caption font-medium text-gray-700 hover:underline"
            >
              <Headset aria-hidden size={16} strokeWidth={1.75} />
              {t('help')}
            </a>
          </div>
        </main>

        <footer className="px-6 pb-6">
          <div
            className={cn(
              'mx-auto flex flex-col items-center gap-1 border-t border-ornament pt-4 text-center',
              measure
            )}
          >
            <p className="text-caption text-gray-600">
              {/* Latin run inside a possibly Arabic sentence — §12. */}
              <span dir="ltr" className="[unicode-bidi:isolate]">
                © {new Date().getFullYear()}
              </span>{' '}
              {firmName(locale)} · {t('rightsReserved')}
            </p>
            {/* Permanent, every tenant — brand-guidelines §7.2. gray-600
                because the component's gray-500 is 4.00:1 on this cream. */}
            <PoweredBy className="text-gray-600" />
          </div>
        </footer>
      </div>

      <StonePanel textureSrc={authPanelTexture()} />
    </div>
  );
}

/**
 * The dark card the mockup puts every action in: `ink`, an `ornament`
 * hairline, and a gold-ringed icon badge.
 *
 * The border is decoration: the card's edge is already drawn by charcoal on
 * cream at 8.89:1. Focus rings inside switch from legal-navy, which barely
 * shows on charcoal, to `on-dark`.
 */
export function TenantAuthCard({
  portal,
  className,
  children,
}: {
  portal: 'staff' | 'client';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-card border border-ornament bg-ink p-6 text-on-dark tablet:p-8',
        '[&_:focus-visible]:outline-on-dark',
        className
      )}
    >
      <PortalBadge portal={portal} />
      {children}
    </div>
  );
}

/** The icon badge at the top of a card. Decorative: the heading names the portal. */
function PortalBadge({ portal }: { portal: 'staff' | 'client' }) {
  return (
    <span
      aria-hidden
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-ornament text-ornament"
    >
      {portal === 'staff' ? (
        <span className="relative">
          <UserRound size={26} strokeWidth={1.5} />
          <LockKeyhole size={11} strokeWidth={2} className="absolute -end-1 -bottom-0.5 rounded-sm bg-ink" />
        </span>
      ) : (
        <UsersRound size={26} strokeWidth={1.5} />
      )}
    </span>
  );
}
