'use server';

import { cookies, headers } from 'next/headers';
import {
  DEMO_GATE_COOKIE,
  configuredPassword,
  gateToken,
  tokensMatch,
} from '@/lib/demo-gate';

export type UnlockResult = { ok: true } | { ok: false; error: 'wrong' | 'notConfigured' };

/**
 * Check the shared demo password and, if it is right, unlock this browser.
 *
 * ===========================================================================
 * THE COMPARISON HAPPENS HERE, NOT IN THE BROWSER
 * ===========================================================================
 * A Server Action, so `DEMO_ACCESS_PASSWORD` is read on the server and never reaches
 * the client bundle. The form posts the attempt and receives a yes or a no; the
 * password it is being compared against does not travel.
 *
 * The cookie stores a hash rather than the password — see lib/demo-gate.ts —
 * so the value sent back on every subsequent request is not the secret itself.
 *
 * ===========================================================================
 * ONE ERROR FOR A WRONG PASSWORD, AND A DIFFERENT ONE FOR NO PASSWORD
 * ===========================================================================
 * They are genuinely different situations. A wrong password is the visitor's
 * problem; a deployment with `DEMO_ACCESS_PASSWORD` unset is the operator's, and the
 * screen saying so is what turns a site nobody can enter from a mystery into a
 * two-minute fix. Neither message reveals anything about the password itself.
 *
 * No rate limiting, and this is the honest place to say so: a shared demo
 * password behind a link given to a handful of people does not warrant it, and
 * a real one would need somewhere to keep counters that this prototype does
 * not have. If this URL is ever given out widely, that changes.
 */
export async function unlockDemo(password: string): Promise<UnlockResult> {
  const expected = configuredPassword();
  if (!expected) return { ok: false, error: 'notConfigured' };

  /*
    Trimmed on both sides — `configuredPassword()` trims the configured value
    too. A shared demo password travels by message and arrives pasted, and a
    trailing space on either side would reject the right password with nothing
    on screen to explain it. The cost is that a password cannot meaningfully
    begin or end with a space, which for this is no cost at all.
  */
  const attempt = await gateToken(password.trim());
  if (!tokensMatch(attempt, await gateToken(expected))) {
    return { ok: false, error: 'wrong' };
  }

  /*
    `secure` from the REQUEST's protocol, not from NODE_ENV.

    The obvious version — secure whenever NODE_ENV is production — is wrong
    here, because the gate only runs in production builds at all. A production
    build served over plain http, which is exactly what `next start` on a laptop
    is, would set a cookie the browser then refuses to store: the password would
    be accepted and the site would stay locked, with nothing on screen to say
    why. Vercel terminates TLS and forwards `x-forwarded-proto: https`, so the
    deployed cookie is still secure.
  */
  const proto = (await headers()).get('x-forwarded-proto');

  const jar = await cookies();
  jar.set(DEMO_GATE_COOKIE, attempt, {
    path: '/',
    sameSite: 'lax',
    // Never read from JavaScript — the middleware reads it server-side.
    httpOnly: true,
    secure: proto === 'https',
    // A fortnight: long enough that a reviewer is not retyping it all week,
    // short enough that a shared link stops working eventually.
    maxAge: 60 * 60 * 24 * 14,
  });

  return { ok: true };
}
