'use server';

import { mockApi, type AddTeamMemberResult } from '@/lib/mock-api';
import { canManageRoster } from '../tabs';

/**
 * Add a person to the firm's roster.
 *
 * ===========================================================================
 * THE FIRST WRITE IN THE PRODUCT, AND IT IS HALF A WRITE
 * ===========================================================================
 * BUILD_PLAN.md §5.1 settles what a submitted form does by what the action
 * asserts. Creating a colleague's record asserts nothing about anyone outside
 * this workspace, so it writes — into the session store in lib/mock-api.ts,
 * which that file's header scopes and dates.
 *
 * Issuing their credential is the other half, and it does not happen. §3.1
 * provisions staff with a temporary password generated when they are added;
 * nothing here generates, stores or sends one. The row appears with
 * `temporaryPasswordIssued` because that is the state a new account is in, and
 * the screen says in words that no password was produced and nobody was
 * emailed. A "we've sent them an invite" toast would be the exact false state
 * the client portal has refused five times.
 *
 * ===========================================================================
 * WHY A SERVER ACTION
 * ===========================================================================
 * The same two reasons search-action.ts gives, with the weights reversed.
 *
 * 1. THE STORE IS ON THE SERVER. Session state lives in the Next process; a
 *    client-side array would be per-tab and would vanish on navigation, which
 *    is a worse lie than the one the session store already carries.
 * 2. IT IS A POST. A colleague's name and email are personal data, and a form
 *    that submitted them as a GET would put both in the address bar, browser
 *    history and every access log in between.
 *
 * ===========================================================================
 * THE GATE RUNS HERE TOO
 * ===========================================================================
 * Not because the UI is untrusted — it is — but because a Server Action is a
 * public HTTP endpoint. Anyone who can reach the page can invoke it directly,
 * and a button the page declined to render does nothing about that.
 *
 * Note which check this is. The TAB is open to every rank, because reading the
 * roster is not privileged. `canManageRoster` is the separate, narrower
 * permission for changing it — see tabs.ts. Using the tab's gate here would
 * have let a paralegal create partner accounts through a screen they are
 * correctly allowed to look at.
 *
 * MOCK: `currentStaff()` is the fake session. At Track A.5 the rank comes from
 * a verified session and this check moves behind the API boundary with it.
 */
export async function addTeamMember(input: {
  name: string;
  email: string;
  rank: string;
}): Promise<AddTeamMemberResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canManageRoster(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  // Validation lives in the data layer, next to the collection it validates
  // against — so "that address is already on the roster" is answered by the
  // roster rather than by a component's copy of it.
  return mockApi.staff.addTeamMember(input);
}
