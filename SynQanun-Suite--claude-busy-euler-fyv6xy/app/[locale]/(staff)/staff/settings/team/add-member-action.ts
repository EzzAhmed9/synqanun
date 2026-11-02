'use server';

import { mockApi, type AddTeamMemberResult, type RosterMember } from '@/lib/mock-api';
import { backendBridge } from '@/lib/backend-bridge';
import { canManageRoster } from '../tabs';

export async function addTeamMember(input: {
  name: string;
  email: string;
  rank: string;
  password?: string;
}): Promise<AddTeamMemberResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canManageRoster(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  // 1. Persist directly to PostgreSQL via backendBridge
  try {
    const backendRes = await backendBridge.team.addMember({
      name: input.name,
      email: input.email,
      rank: input.rank,
      password: input.password,
    });

    if (backendRes?.ok && backendRes.member) {
      const m = backendRes.member;
      const today = new Date().toISOString().slice(0, 10);
      const newMember: RosterMember = {
        id: m.id,
        name: m.name,
        rank: m.rank as any,
        email: m.email,
        status: m.status as any,
        joinedOn: today,
        openEngagements: 0,
        practiceAreas: [],
        isYou: false,
        addedThisSession: true,
      };
      return { ok: true, member: newMember };
    } else if (backendRes && !backendRes.ok) {
      if (backendRes.error?.includes('already registered')) {
        return { ok: false, error: 'emailTaken' };
      }
      if (backendRes.error?.includes('email')) {
        return { ok: false, error: 'emailInvalid' };
      }
      if (backendRes.error?.includes('rank')) {
        return { ok: false, error: 'rankInvalid' };
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback to mock session if backend is offline
  return mockApi.staff.addTeamMember(input);
}
