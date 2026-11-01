/**
 * Whether the tenant splash has played this session.
 *
 * A plain module, not a client one, so the server-rendered page can inline
 * the pre-paint script below and share the key with TenantSplash.
 */

export const SPLASH_SEEN_KEY = 'syn-tenant-splash-seen';

/**
 * Runs during HTML parse, before the overlay is painted: if the splash has
 * already played this session, or the reader prefers reduced motion, mark
 * <html> so CSS hides the overlay. Without this, a reload would flash the
 * overlay until hydration removed it.
 *
 * sessionStorage throws when storage is blocked; the splash then plays, and
 * TenantSplash's in-memory flag still stops it replaying on client-side
 * navigation.
 */
export const SPLASH_SKIP_SCRIPT = `try{if(sessionStorage.getItem('${SPLASH_SEEN_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.setAttribute('data-splash-skip','')}}catch(e){}`;
