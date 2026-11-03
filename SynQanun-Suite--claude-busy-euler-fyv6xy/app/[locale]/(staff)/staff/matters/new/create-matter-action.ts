'use server';

import { revalidatePath } from 'next/cache';
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

  let res: CreateMatterResult;
  const backendRes = await backendBridge.matters.create(input);
  if (backendRes) {
    if (!backendRes.ok) return { ok: false, error: backendRes.error };
    res = { ok: true, reference: backendRes.reference };
  } else {
    res = await mockApi.staff.createMatter(input);
  }

  if (res.ok) {
    revalidatePath('/[locale]/staff/clients', 'page');
    revalidatePath('/[locale]/staff/matters', 'page');
    revalidatePath('/[locale]/staff', 'page');
  }

  return res;
}
