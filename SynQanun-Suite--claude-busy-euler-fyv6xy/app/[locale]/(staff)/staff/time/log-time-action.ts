'use server';

import { mockApi, type LogTimeResult } from '@/lib/mock-api';
import { recordsTime } from '@/lib/ranks';

/**
 * Record time against a file.
 *
 * ===========================================================================
 * THE GATE IS `RANKS_THAT_BILL`, AND IT RUNS HERE TOO
 * ===========================================================================
 * The same allow-list that decides whether the timer mounts in the staff
 * layout and whether the hours card renders on a dashboard — lib/ranks.ts. A
 * legal secretary does not record billable time, has no row in
 * `demoWeeklyHours`, and would have nowhere for an entry to land.
 *
 * It is checked again here because a Server Action is a public HTTP endpoint.
 * A card the page declined to render stops nobody from calling this directly,
 * and an entry written for a rank with no hours row would throw the next time
 * that person's dashboard loaded.
 *
 * ===========================================================================
 * WHOSE TIME IT IS, IS NOT AN ARGUMENT
 * ===========================================================================
 * The caller does not say who did the work; the session does. Accepting a
 * `staffId` from the form would let anyone log hours against anyone — which is
 * both a way to inflate a colleague's figures and a way to hide your own, on a
 * record that feeds what the firm bills.
 *
 * MOCK: `currentStaff()` is the fake session. At Track A.5 this becomes a POST
 * on a verified session and the identity comes from there, which is the point
 * at which "the session decides" stops being a convention and starts being
 * enforced.
 */
export async function logTime(input: {
  engagementRef: string;
  on: string;
  minutes: number;
  description: string;
  billable: boolean | null;
}): Promise<LogTimeResult> {
  const me = await mockApi.staff.currentStaff();

  if (!recordsTime(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  return mockApi.staff.logTime({ ...input, staffId: me.id });
}
