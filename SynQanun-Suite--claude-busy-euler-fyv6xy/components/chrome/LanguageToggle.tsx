'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/lib/i18n/navigation';
import { localeLabels, type Locale } from '@/lib/i18n/routing';
import { cn } from '@/lib/utils';

export interface LanguageToggleProps {
  /** 'icon' for the TopBar icon group, 'full' for the splash/login screen. */
  variant?: 'icon' | 'full';
  className?: string;
}

/**
 * EN ⇄ AR toggle.
 *
 * design.md §12: "Language toggle lives in the top nav, persistent, never
 * buried in a settings screen." It is mounted in <TopBar> for exactly that
 * reason.
 *
 * HOW `dir` GETS SWITCHED — worth being explicit, because it looks like
 * something is missing here. This component only changes the locale segment of
 * the URL. It does not touch the DOM. Navigating to the other locale re-renders
 * app/[locale]/layout.tsx, which sets `dir` on <html> from `directionOf(locale)`.
 *
 * That indirection is the point: `dir` is derived from one value in one place,
 * so it cannot drift out of sync with the active translations the way a
 * client-side `document.documentElement.dir = …` eventually would. Every
 * logical property in the app (`ps-`, `pe-`, `ms-`, `me-`, `border-s-`,
 * `text-start`, `end-*`) then mirrors off that single attribute.
 *
 * The label always shows the language you would switch TO, written in its own
 * script — "العربية" while in English, "English" while in Arabic — so it is
 * legible to someone who cannot read the current interface language.
 */
export function LanguageToggle({ variant = 'icon', className }: LanguageToggleProps) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const nextLocale: Locale = locale === 'ar' ? 'en' : 'ar';

  function switchLocale() {
    startTransition(() => {
      // `pathname` from lib/i18n/navigation is already locale-stripped, so this
      // stays on the same screen and only swaps the language.
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={isPending}
      lang={nextLocale}
      aria-label={`${t('switchLanguage')} — ${localeLabels[nextLocale]}`}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm text-gray-500',
        'hover:bg-gray-100 hover:text-gray-700 disabled:opacity-60',
        variant === 'icon' ? 'h-9 min-w-9 px-2' : 'h-10 px-3 text-body',
        className
      )}
    >
      <Languages aria-hidden size={18} className="shrink-0" />
      {/*
        The label drops below 768px in the compact variant. On a 375px screen
        with the icon rail showing, the top bar has about 311px; this label was
        taking roughly 60 of them and the page title was being squeezed down to
        an ellipsis. The icon plus the `aria-label` above still say what the
        control does, and the full label returns from tablet up.

        The `full` variant — splash and login, where the toggle stands alone
        with room to spare — always keeps its label.
      */}
      <span
        className={cn(
          variant === 'icon' ? 'text-caption font-medium max-tablet:hidden' : undefined
        )}
      >
        {localeLabels[nextLocale]}
      </span>
    </button>
  );
}

export default LanguageToggle;
