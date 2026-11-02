import { cookies } from 'next/headers';
import { SIGNED_IN_STAFF_ID, demoStaff } from '@/fixtures/practice';
import { RANKS, type Rank } from '@/lib/ranks';

/**
 * Which staff member the deployed demo is being viewed as.
 *
 * ===========================================================================
 * THIS IS A DEMO DEVICE, NOT AUTHENTICATION, AND THE DIFFERENCE IS THE POINT
 * ===========================================================================
 * Track A has no login. `SIGNED_IN_STAFF_ID` is a module constant, which is
 * fine locally — you edit it and the dev server reloads — and useless on a
 * deployed build, where it is baked in at compile time. Reviewing the five rank
 * dashboards meant editing code and redeploying five times.
 *
 * So the viewer is a cookie. It does not authenticate anybody, it does not
 * grant anything, and it is not a session: it selects which fixture person the
 * prototype renders as. Everything it changes is a READ. The rank gates behind
 * it are unchanged and still enforced — see staffRouteAllows and the four
 * permissions.ts modules — so switching to a paralegal genuinely refuses the
 * billing screen rather than hiding a link to it.
 *
 * What it is NOT, and must not become: a way to look at data a rank cannot see.
 * The gates run against whoever this returns, so they run against the switched
 * rank, not the constant. A reviewer switching to legal secretary sees exactly
 * what a legal secretary sees, refusals included. That is the whole value.
 *
 * ===========================================================================
 * WHY A COOKIE AND NOT A QUERY PARAMETER
 * ===========================================================================
 * A `?as=` parameter would have to survive every link on every screen, and the
 * first link that dropped it would silently snap the reader back to the
 * partner mid-review — the hardest kind of bug to notice, because the screen
 * still looks right. A cookie survives navigation without any screen having to
 * know it exists, which is why `currentStaff()` can read it and none of its
 * thirty-four callers changed.
 *
 * It costs no static rendering: all twenty-nine staff pages already declare
 * `force-dynamic`, so nothing was being cached that this could spoil.
 *
 * MOCK: Track A.5 deletes this file. A real session resolves the viewer from an
 * authenticated credential, and the only honest way to see the product as
 * another rank is to sign in as somebody who holds it.
 */

/** Cookie name. Prefixed so it is obviously ours in a browser inspector. */
export const DEMO_VIEWER_COOKIE = 'syn-demo-viewer';

/**
 * The staff id to render as.
 *
 * Validated against the roster as an ALLOW-LIST, never trusted as written: a
 * cookie is reader-supplied input, and an unrecognised value falls back to the
 * built-in constant rather than throwing. `demoStaff` rather than `allStaff()`
 * on purpose — somebody added to the roster this session is a record, not a
 * person who can be signed in as.
 */
export async function viewerStaffId(): Promise<string> {
  try {
    const jar = await cookies();
    const raw = jar.get(DEMO_VIEWER_COOKIE)?.value;
    if (raw) return raw;
  } catch {
    // Read outside a request scope. Nothing to resolve; take the default.
  }
  return SIGNED_IN_STAFF_ID;
}

/**
 * One switchable person per rank, derived rather than written down.
 *
 * The first ACTIVE holder of each rank, in the roster's own order, so the list
 * cannot drift from the fixtures and cannot offer somebody deactivated — whose
 * screens would be a study in a different problem. A rank with no active holder
 * simply does not appear.
 */
export function switchableViewers(): { id: string; rank: Rank }[] {
  return RANKS.map((rank) => {
    const person = demoStaff.find(
      (member) => member.rank === rank && member.status === 'active'
    );
    return person ? { id: person.id, rank } : null;
  }).filter((row): row is { id: string; rank: Rank } => row !== null);
}
