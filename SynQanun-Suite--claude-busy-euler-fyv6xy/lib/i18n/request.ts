import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * Per-request i18n config. Wired up in next.config.ts via
 * createNextIntlPlugin('./lib/i18n/request.ts').
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`./${locale}.json`)).default,
    // design.md §12: Western (0–9) digits in BOTH languages for dates, currency
    // and IDs — standard practice in Egyptian/GCC legal and financial
    // documents. `ar` (rather than `ar-EG`) keeps Intl on Latin numerals.
    formats: {
      dateTime: {
        short: { day: 'numeric', month: 'short', year: 'numeric' },
      },
    },
  };
});
