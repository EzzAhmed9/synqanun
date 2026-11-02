'use server';

import { mockApi, type SetTeamAccessResult } from '@/lib/mock-api';
import { backendBridge } from '@/lib/backend-bridge';
import { canManageAccess } from '../tabs';

export async function setTeamAccess(input: {
  staffId: string;
  grant: boolean;
}): Promise<SetTeamAccessResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canManageAccess(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  // 1. Persist directly to PostgreSQL via backendBridge
  try {
    const backendRes = await backendBridge.team.setAccess({
      staffId: input.staffId,
      grant: input.grant,
    });
    if (backendRes?.ok) {
      return { ok: true, change: input.grant ? 'granted' : 'removed' };
    }
  } catch {
    // Fallback below
  }

  return mockApi.staff.setTeamAccess({ staffId: input.staffId, grant: input.grant, actorId: me.id });
}
