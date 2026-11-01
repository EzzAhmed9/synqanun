'use server';

import { mockApi, type ReopenMatterResult } from '@/lib/mock-api';
import { canReopenMatter } from './permissions';
import { backendBridge } from '@/lib/backend-bridge';

/**
 * Reopen a matter.
 * Dispatches to FastAPI PostgreSQL Backend with fallback.
 */
export async function reopenMatter(reference: string): Promise<ReopenMatterResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canReopenMatter(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  const backendRes = await backendBridge.matters.reopen(reference);
  if (backendRes && backendRes.ok) {
    return { ok: true, reference: backendRes.reference };
  }

  return mockApi.staff.reopenMatter(reference, me.id);
}
