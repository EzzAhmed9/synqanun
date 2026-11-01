'use server';

import { mockApi, type ReassignLeadResult } from '@/lib/mock-api';
import { canReassignLead } from './permissions';
import { backendBridge } from '@/lib/backend-bridge';

/**
 * Put one person in charge of several files.
 *
 * The gate is re-run here because a Server Action is a public HTTP endpoint,
 * and this is the one in the product with the widest reach: a single call can
 * move any number of matters, and the lead it sets is read on the register, on
 * a person's own dashboard, on the client record and in global search.
 *
 * Validation lives in the data layer, next to the collections it checks — and
 * deliberately checks EVERY reference before writing any of them. A bulk action
 * that half-applied would leave the reader unable to see which half took.
 */
export async function reassignLead(input: {
  references: string[];
  staffId: string;
}): Promise<ReassignLeadResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canReassignLead(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  const backendRes = await backendBridge.matters.reassignLead(input);
  if (backendRes) {
    if (backendRes.ok) {
      return {
        ok: true,
        changed: backendRes.changed ?? backendRes.reassignedCount,
        leadName: backendRes.leadName,
      };
    }
    if (backendRes.detail) {
      return { ok: false, error: backendRes.detail as any };
    }
  }

  return mockApi.staff.reassignLead(input);
}
