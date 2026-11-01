'use server';

import { mockApi, type CreateMatterResult } from '@/lib/mock-api';
import { canOpenMatter } from '../permissions';
import { backendBridge } from '@/lib/backend-bridge';

/**
 * Open a matter.
 * Dispatches to FastAPI PostgreSQL Backend with fallback.
 */
export async function createMatter(input: {
  title: string;
  workType: string;
  clientId: string;
  practiceArea: string;
  forum: string;
  leadId: string;
  scope?: string;
}): Promise<CreateMatterResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canOpenMatter(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  const backendRes = await backendBridge.matters.create(input);
  if (backendRes) {
    if (!backendRes.ok) return { ok: false, error: backendRes.error };
    return { ok: true, reference: backendRes.reference };
  }

  return mockApi.staff.createMatter(input);
}
