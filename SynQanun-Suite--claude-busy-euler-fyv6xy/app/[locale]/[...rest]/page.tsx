import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

/**
 * Catches any address under a locale that no other route claims, so that
 * `app/[locale]/not-found.tsx` is what renders.
 *
 * WHY THIS FILE HAS TO EXIST
 * ---------------------------------------------------------------------------
 * Not obvious, and it was found in the browser rather than by reading the
 * routes. A `not-found.tsx` inside `[locale]` only handles a `notFound()`
 * thrown by something that already matched a route in that segment. A URL like
 * /en/nothing-here matches nothing at all, so Next never enters the segment and
 * falls back to its own built-in 404 page — which is unstyled, has no locale,
 * renders `dir=""`, and for an Arabic client is a screen in the wrong language
 * with no way back into the portal. Verified: that is exactly what it did.
 *
 * A catch-all route gives the request something to match, so the `notFound()`
 * below is thrown from INSIDE the locale segment and the translated page
 * renders. This is next-intl's documented arrangement for the same reason.
 *
 * It does not shadow the real routes: Next resolves specific segments before a
 * catch-all, so /en/documents still reaches the documents page. And it cannot
 * swallow /en itself, since a catch-all needs at least one segment.
 */
export default async function LocaleCatchAll({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Set before throwing, or the not-found page has no locale to translate in.
  setRequestLocale(locale);

  notFound();
}
