import { isThemedTenant, themeVariables } from '@/fixtures/firm';
import type { Metadata } from 'next';
import { Cairo, IBM_Plex_Sans_Arabic, Inter, JetBrains_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { UIStateProvider } from '@/components/providers/UIStateProvider';
import { directionOf, routing } from '@/lib/i18n/routing';
import '../globals.css';

/**
 * Typeface loading — brand-guidelines.md §4, BUILD_PLAN.md §1.
 *
 * BUILD_PLAN.md asks for "self-hosted variable fonts… Avoids a Google Fonts
 * runtime dependency for an on-prem-deployed product." `next/font/google` does
 * exactly that: it fetches each family at BUILD time and serves the files from
 * this app's own origin. No request reaches Google at runtime, and there is no
 * external stylesheet in the document head. The only Google dependency left is
 * during `next build`, which an on-prem release pipeline can satisfy once and
 * cache. (If even that must go, drop the .woff2 files into app/fonts/ and swap
 * these four calls for `next/font/local` — no other file changes.)
 *
 * Cairo is loaded with both Arabic and Latin subsets because brand-guidelines.md
 * §4 chose it precisely for being "drawn natively for *both* Arabic and Latin
 * under a single family… so headlines feel like they belong to the same brand
 * as the logo, in either script."
 */
const cairo = Cairo({
  subsets: ['latin', 'arabic'],
  variable: '--font-cairo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  // brand-guidelines.md §4 specifies 400–600 for UI body text. Plex Sans
  // Arabic ships as static instances, so the weights are listed explicitly.
  weight: ['400', '500', '600'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SynQanun Suite',
  description: 'AI-native legal operations for law firms and legal departments.',
};

/** Pre-render both locales at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Opts this subtree into static rendering with next-intl.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      /**
       * THE `dir` SWITCH — design.md §12.
       *
       * This single attribute is what makes the entire interface mirror. It is
       * derived from the locale in one place, so it can never disagree with the
       * active translations. Every logical property used across the codebase
       * (`ps-`, `pe-`, `ms-`, `me-`, `border-s-`, `text-start`, `end-*`,
       * `insetInlineEnd`) resolves against it: the sidebar moves to the right,
       * the timer pill flips corners, the active-nav indicator swaps edges.
       *
       * What does NOT flip: the SynQanun and client logos
       * (brand-guidelines.md §2.5, design.md §7 — "logos never flip; only
       * layout and directional icons do"). The Logo and FeatherMark components
       * pin `direction: ltr` on themselves to guarantee it.
       */
      dir={directionOf(locale)}
      /*
        THE TENANT'S PALETTE, EMITTED ONCE.

        Spread onto <html> rather than injected per screen so there is exactly
        one place a theme enters the product, and so the variables are present
        before the first paint — a theme applied lower down flashes the default
        palette first, which on a re-skinned tenant is a flash of a different
        firm's product.

        Null in accent mode, which emits nothing: globals.css carries SynQanun
        fallbacks on every one of these names, so an unthemed tenant renders
        exactly as it always did. See fixtures/firm.ts.
      */
      // Marks the document for the `data-themed:` Tailwind variant, so a
      // component can differ between accent and themed mode without reading
      // tenant configuration itself. Same place the palette is emitted.
      data-themed={isThemedTenant() ? '' : undefined}
      style={themeVariables() ?? undefined}
      className={`${cairo.variable} ${inter.variable} ${plexArabic.variable} ${jetbrainsMono.variable}`}
      // FUTURE: dark mode attaches here as data-theme="dark". See the
      // dark-mode block in app/globals.css for what else it entails. Not built.
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>
          <UIStateProvider>{children}</UIStateProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
