'use server';

import { mockApi, type ReopenMatterResult } from '@/lib/mock-api';
import { canReopenMatter } from './permissions';
import { backendBridge } from '@/lib/backend-bridge';

/**
 * Close/archive a matter.
 * Dispatches to FastAPI PostgreSQL Backend.
 */
export async function closeMatter(reference: string): Promise<ReopenMatterResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canReopenMatter(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  const backendRes = await backendBridge.matters.close(reference);
  if (backendRes && backendRes.ok) {
    return { ok: true, reference: backendRes.reference };
  }

  return { ok: false, error: 'notFound' };
}
