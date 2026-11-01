'use server';

import { mockApi, type SetTeamAccessResult } from '@/lib/mock-api';
import { canManageAccess } from '../tabs';

/**
 * Remove or give back one colleague's access to the workspace.
 *
 * The gate is re-run here: a Server Action is a public HTTP endpoint, and the
 * Team access tab not being drawn for a rank stops nobody who posts to it.
 * The actor is the session's, never a field of the request, so the audit line
 * cannot be written in someone else's name.
 *
 * MOCK: session state only — nothing is locked, revoked or sent. Track A.5.
 */
export async function setTeamAccess(input: {
  staffId: string;
  grant: boolean;
}): Promise<SetTeamAccessResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canManageAccess(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  return mockApi.staff.setTeamAccess({ staffId: input.staffId, grant: input.grant, actorId: me.id });
}
