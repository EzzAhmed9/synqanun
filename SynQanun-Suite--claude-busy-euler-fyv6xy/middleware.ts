import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_GATE_COOKIE, DEMO_LOGIN_PATH, cookieUnlocks, gateApplies } from './lib/demo-gate';
import { routing } from './lib/i18n/routing';

/**
 * Locale routing, behind the deployment's password gate.
 *
 * ===========================================================================
 * THE GATE IS HERE BECAUSE HERE IS THE ONLY PLACE IT COVERS EVERYTHING
 * ===========================================================================
 * A check inside a layout protects that layout's subtree and nothing else, and
 * this product has three route groups plus a catch-all. Middleware runs before
 * any of them, so /en/staff, /ar/dashboard, a typo'd path and a route that does
 * not exist yet are all covered by one rule — including the direct URLs that
 * are the whole way into this prototype, since it has no navigation from the
 * splash into the workspaces by design.
 *
 * ORDER MATTERS AND IS NOT OBVIOUS. The gate runs FIRST, before next-intl sees
 * the request. Running the locale middleware first would let it redirect `/` to
 * `/en` and hand back a response, and the gate would then be deciding about a
 * request that had already been answered.
 *
 * The login page is the one exception, and it is exempted by path rather than
 * by cookie for the obvious reason: a visitor who cannot reach it cannot
 * unlock anything. It still goes through the locale middleware, because it is a
 * real bilingual screen like any other.
 *
 * ===========================================================================
 * WHAT IS NOT BEHIND IT
 * ===========================================================================
 * Only what the matcher already excluded: Next's internals, and anything with a
 * file extension — which includes /brand/*.png. The brand assets are a logo and
 * a feather, published material rather than anything the gate exists to
 * protect, and excluding them keeps the login screen able to render its own
 * wordmark.
 */
const intl = createMiddleware(routing);

/** The login screen, at any locale, with or without a trailing slash. */
function isLoginPath(pathname: string): boolean {
  return routing.locales.some(
    (locale) =>
      pathname === `/${locale}/${DEMO_LOGIN_PATH}` ||
      pathname === `/${locale}/${DEMO_LOGIN_PATH}/`
  );
}

/** The locale already in the path, so the redirect does not always land in English. */
function localeOf(pathname: string): string {
  const first = pathname.split('/')[1];
  return routing.locales.includes(first as never) ? first : routing.defaultLocale;
}

export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!gateApplies() || isLoginPath(pathname)) {
    return intl(request);
  }

  const unlocked = await cookieUnlocks(request.cookies.get(DEMO_GATE_COOKIE)?.value);
  if (unlocked) {
    return intl(request);
  }

  /*
    Where the visitor was going, so unlocking returns them to it rather than
    dumping them on the splash. Carried as a path only — never an absolute URL,
    which would make this an open redirect that could bounce somebody to another
    origin after they type a password.
  */
  const target = new URL(`/${localeOf(pathname)}/${DEMO_LOGIN_PATH}`, request.url);
  const wanted = `${pathname}${search}`;
  if (wanted !== '/' && !wanted.startsWith('//')) {
    target.searchParams.set('next', wanted);
  }

  return NextResponse.redirect(target);
}

export const config = {
  // Match everything except Next internals, API routes, and static files
  // (anything with a dot in the last segment — including /brand/*.png).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
