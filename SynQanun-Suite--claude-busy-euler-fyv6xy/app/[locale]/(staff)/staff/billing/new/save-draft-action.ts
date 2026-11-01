'use server';

import { mockApi, type SaveInvoiceDraftResult } from '@/lib/mock-api';
import { staffRouteAllows } from '@/components/chrome/nav-items';
import { backendBridge } from '@/lib/backend-bridge';

/**
 * Save an assembled fee statement as a draft.
 * Dispatches to FastAPI PostgreSQL Backend with fallback.
 */
export async function saveInvoiceDraft(input: {
  engagementRef: string;
  description: string;
  lines: {
    description: string;
    minutes: number | null;
    fromEntryIds: string[];
    amount: number | null;
  }[];
}): Promise<SaveInvoiceDraftResult> {
  const me = await mockApi.staff.currentStaff();

  if (!staffRouteAllows(me.rank, 'billing')) {
    return { ok: false, error: 'notPermitted' };
  }

  // Persist draft to FastAPI PostgreSQL backend
  const backendRes = await backendBridge.billing.saveDraft(input);
  if (backendRes && backendRes.ok && backendRes.draft) {
    return { ok: true, draft: backendRes.draft as any };
  }

  return mockApi.staff.saveInvoiceDraft({ ...input, preparedById: me.id });
}

/**
 * Save and officially issue/send an invoice to the client in PostgreSQL.
 */
export async function sendInvoiceToClient(input: {
  engagementRef: string;
  description: string;
  lines: {
    description: string;
    minutes: number | null;
    fromEntryIds: string[];
    amount: number | null;
  }[];
}): Promise<SaveInvoiceDraftResult & { reference?: string }> {
  const me = await mockApi.staff.currentStaff();

  if (!staffRouteAllows(me.rank, 'billing')) {
    return { ok: false, error: 'notPermitted' };
  }

  // 1. Save draft to PostgreSQL backend
  const backendRes = await backendBridge.billing.saveDraft(input);
  if (backendRes && backendRes.ok && backendRes.draft) {
    const ref = backendRes.reference || backendRes.draft.reference;
    // 2. Officially issue the invoice so status = "due"
    if (ref) {
      await backendBridge.billing.issue(ref);
    }
    return { ok: true, draft: backendRes.draft as any, reference: ref };
  }

  return mockApi.staff.saveInvoiceDraft({ ...input, preparedById: me.id });
}
