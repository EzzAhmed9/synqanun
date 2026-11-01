import { defineRouting } from 'next-intl/routing';

/**
 * Locale routing for SynQanun Suite.
 *
 * design.md §0: "Bilingual: Arabic and English, both first-class, not a
 * translated afterthought." Both locales are always prefixed in the URL
 * (`/en/...`, `/ar/...`) so a demo link can pin a language directly — there is
 * no unprefixed default that silently means English.
 */
export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

/**
 * Text direction for a locale.
 *
 * design.md §12: full mirroring in Arabic — sidebar moves to the end side,
 * start-aligned text flips, directional icons flip. Logos never flip
 * (brand-guidelines.md §2.5), which is why direction is derived here once and
 * read from `dir` by CSS logical properties, rather than components each
 * deciding what "left" means.
 */
export function directionOf(locale: string): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** Human-readable label for each locale, always written in its own script. */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
};
