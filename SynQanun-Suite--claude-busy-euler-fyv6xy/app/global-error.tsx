'use client';

import * as React from 'react';

/**
 * The last boundary. What is left when the root layout itself has failed.
 *
 * ===========================================================================
 * THE HOLE THIS FILLS, AND HOW IT WAS FOUND
 * ===========================================================================
 * `app/[locale]/error.tsx` catches everything BELOW it, which was verified
 * rather than assumed: a staff page that throws renders it, and so does a throw
 * inside `app/[locale]/(staff)/layout.tsx`.
 *
 * What it does not catch is its own segment's layout — and there is no
 * `app/layout.tsx` in this project, so `app/[locale]/layout.tsx` IS the root
 * layout. A throw there returned Next's built-in fallback: a bare
 * `<html id="__next_error__">` with no `dir`, no fonts, no translation and no
 * way back. Confirmed by making that layout throw and requesting
 * /en/staff/billing.
 *
 * It is reachable, not theoretical. `lib/i18n/request.ts` resolves the whole
 * dictionary with `(await import('./${locale}.json')).default`, and that import
 * is awaited at exactly this level when the layout renders
 * `<NextIntlClientProvider>`. A dictionary that fails to load takes the entire
 * application out through the unstyled fallback — on both locales at once.
 *
 * ===========================================================================
 * WHY THIS FILE LOOKS NOTHING LIKE THE REST OF THE CODEBASE
 * ===========================================================================
 * It replaces the root layout, so it has to supply its own <html> and <body>.
 * That means everything the layout normally provides is gone:
 *
 *   · NO TRANSLATIONS. The most likely reason to be here is that the message
 *     catalogue did not load, so `useTranslations` would throw inside the
 *     boundary that exists to catch throwing. Both languages are printed, one
 *     after the other, which is the only honest answer when the product cannot
 *     tell which one the reader speaks.
 *
 *   · NO TAILWIND CLASSES, and no component from components/ui. The stylesheet
 *     is imported by the root layout that just failed; a class name with no
 *     stylesheet behind it renders as nothing. The styling here is inline and
 *     deliberately plain — system fonts, no brand colour, no logo. A polished
 *     error page assembled from parts that may not have loaded is a page that
 *     can fail twice.
 *
 *   · NO next-intl <Link>. Locale-aware routing comes from the same subtree.
 *     A plain <a href="/"> is what is left, and the middleware will put the
 *     reader on a locale from there.
 *
 * `dir` is not set, because nothing here knows the locale. The Arabic line
 * carries its own `dir="rtl"` so it reads correctly inside an LTR document.
 *
 * MOCK: like app/[locale]/error.tsx, the production version reports `digest` to
 * an error tracker here. Track B owns the tracker (BUILD_PLAN.md §6). A
 * reference number on screen with nothing listening is theatre, so there is
 * none.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[SynQanun] Root layout failed', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#ffffff',
          color: '#333333',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <main style={{ maxWidth: '30rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
            This page could not be loaded
          </h1>
          <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
            Something went wrong before the page could start. Nothing you have done has been
            lost.
          </p>

          {/* The same two sentences in Arabic, because nothing here knows which
              language the reader has. */}
          <p
            dir="rtl"
            lang="ar"
            style={{ fontSize: '0.9375rem', lineHeight: 1.7, margin: '0 0 1.75rem' }}
          >
            تعذّر تحميل هذه الصفحة. حدث خطأ قبل أن تبدأ الصفحة، ولم يضع شيء ممّا قمت به.
          </p>

          <div
            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #cccccc',
                background: '#f5f5f5',
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
              }}
            >
              Try again · إعادة المحاولة
            </button>
            <a
              href="/"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #cccccc',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Start again · العودة إلى البداية
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
