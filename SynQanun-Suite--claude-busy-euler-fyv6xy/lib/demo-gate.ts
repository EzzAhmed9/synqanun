/**
 * The password gate in front of the whole deployed prototype.
 *
 * ===========================================================================
 * WHAT THIS IS FOR, AND WHAT IT IS NOT
 * ===========================================================================
 * This repository is a white-label legal product carrying a firm's name and a
 * set of invented clients, matters and invoices realistic enough to be mistaken
 * for real records. Deployed to a public URL it is one search-engine crawl away
 * from being read as a real firm's workspace.
 *
 * So the deployment gets a shared password. It is a doormat, not a lock: one
 * secret shared by everybody who is shown the demo, no accounts, no sessions,
 * no audit. It exists to keep the prototype off the open web, and it is NOT
 * the authentication this product lacks — the gateways are still honest no-ops
 * behind it, and Track A.5 still has to build the real thing.
 *
 * ===========================================================================
 * THE COOKIE HOLDS A HASH, NOT THE PASSWORD
 * ===========================================================================
 * Storing the password itself would put it in a header on every request and in
 * whatever logs see them. The cookie holds SHA-256 of the password instead, so
 * a stolen cookie does not reveal it — and, more to the point, a visitor cannot
 * forge a valid cookie without already knowing the password.
 *
 * Web Crypto rather than `node:crypto`, because the middleware that reads this
 * runs on the Edge runtime where the Node module does not exist.
 *
 * SEPARATE FROM THE RANK SWITCHER'S COOKIE, deliberately. They answer different
 * questions — "may this browser see the demo at all" versus "which fixture
 * person is it rendering as" — and one is a secret while the other is a
 * preference. Sharing a cookie would mean clearing a rank also locked you out.
 *
 * ===========================================================================
 * FAIL CLOSED IN PRODUCTION, OPEN IN DEVELOPMENT
 * ===========================================================================
 * With no DEMO_ACCESS_PASSWORD set, a deployed build refuses everything rather than
 * serving everything. A missing environment variable is the likeliest way this
 * gate ever fails, and the safe direction for that failure is a locked site
 * rather than a published one — the login screen says the deployment has no
 * password configured so the cause is obvious rather than mysterious.
 *
 * Locally the gate is simply off. Nobody should have to set an environment
 * variable to run `npm run dev`, and a password on localhost protects nothing.
 *
 * MOCK: none, deliberately. This is not a fake standing in for something real —
 * it is deployment configuration, and it stays until the prototype is either
 * taken down or replaced by a build with real authentication.
 */

/** Cookie name. Distinct from `syn-demo-viewer`; see above. */
export const DEMO_GATE_COOKIE = 'syn-demo-gate';

/** Where an unauthenticated visitor is sent. Locale-prefixed at redirect time. */
export const DEMO_LOGIN_PATH = 'demo-login';

/**
 * The configured password, or null when the deployment has none.
 *
 * ===========================================================================
 * TWO NAMES ACCEPTED, AND THAT IS A FIX RATHER THAN SLOPPINESS
 * ===========================================================================
 * `DEMO_ACCESS_PASSWORD` is the name .env.example has carried since Batch 0,
 * and it stays the documented one. `DEMO_PASSWORD` is accepted because the
 * gate was specified under that name, built under it, and renamed to match the
 * existing file part-way through — which is exactly the sort of detail that
 * gets set once in a dashboard and never revisited.
 *
 * A deployment where the operator set a reasonable name and got "no demo
 * password configured" is a bad failure: it looks like the code is broken, the
 * fix is invisible, and the only way to find it is to read this file. Accepting
 * both costs one line and removes the whole class of problem.
 *
 * Trimmed, because a value pasted into a dashboard field arrives with
 * whitespace more often than anybody expects, and a trailing space here means
 * the right password is rejected forever with no way to see why.
 */
export function configuredPassword(): string | null {
  const raw = process.env.DEMO_ACCESS_PASSWORD ?? process.env.DEMO_PASSWORD;
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/**
 * Whether the gate applies at all.
 *
 * Off in development so `npm run dev` needs no configuration. On in production
 * whether or not a password is set — see the fail-closed note above.
 */
export function gateApplies(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * The cookie value that proves knowledge of the password.
 *
 * SHA-256 as lowercase hex. Not a password-hashing function, and it does not
 * need to be: the input is a single high-entropy shared secret rather than a
 * user-chosen password in a stealable database, and there is nothing here to
 * mount an offline attack against.
 */
export async function gateToken(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`synqanun-demo-gate:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compare two tokens without leaking their difference through timing.
 *
 * Overkill for a shared demo password, and cheap enough that writing the
 * sloppy version would only have been a worse habit.
 */
export function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Whether a request's cookie value unlocks the site. */
export async function cookieUnlocks(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const password = configuredPassword();
  if (!password) return false; // fail closed
  return tokensMatch(value, await gateToken(password));
}
