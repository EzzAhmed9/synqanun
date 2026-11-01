'use server';

import { mockApi, type CreateClientResult } from '@/lib/mock-api';
import { canAddClient } from '../permissions';
import { backendBridge } from '@/lib/backend-bridge';

/**
 * Take on a client.
 * Dispatches to FastAPI PostgreSQL Backend with fallback.
 */
export async function createClient(input: {
  name: string;
  summary?: string;
  standing: string;
}): Promise<CreateClientResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canAddClient(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  const backendRes = await backendBridge.clients.create(input);
  if (backendRes) {
    if (!backendRes.ok) {
      const err = backendRes.error === 'duplicate' ? 'nameTaken' : backendRes.error;
      return { ok: false, error: err };
    }
    return { ok: true, id: backendRes.clientId || backendRes.id };
  }

  return mockApi.staff.createClient(input);
}
