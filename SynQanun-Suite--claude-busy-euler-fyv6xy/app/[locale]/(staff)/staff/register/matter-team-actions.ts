'use server';

import { backendBridge } from '@/lib/backend-bridge';

export async function getActiveStaffRosterAction() {
  try {
    const data = await backendBridge.team.list();
    if (data?.members) {
      return {
        ok: true,
        members: data.members.filter((m: any) => m.hasAccess !== false),
      };
    }
    return { ok: false, members: [] };
  } catch {
    return { ok: false, members: [] };
  }
}

export async function assignLawyerToMatterAction(
  matterRef: string,
  staffId: string,
  roleAr: string = 'محامٍ مشارك',
  roleEn: string = 'Associate'
) {
  try {
    const res = await backendBridge.team.assignToMatter(matterRef, {
      staffId,
      roleAr,
      roleEn,
    });
    return res;
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to assign lawyer' };
  }
}

export async function removeLawyerFromMatterAction(matterRef: string, staffId: string) {
  try {
    const res = await backendBridge.team.removeFromMatter(matterRef, staffId);
    return res;
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to remove lawyer' };
  }
}
