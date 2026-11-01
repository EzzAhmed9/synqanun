'use server';

import { backendBridge } from '@/lib/backend-bridge';
import { revalidatePath } from 'next/cache';

export async function inviteContactAction(clientId: string, payload: {
  name: string;
  email: string;
  role: string;
  title?: string;
  note?: string;
}) {
  const res = await backendBridge.clients.addContact(clientId, {
    name: payload.name,
    email: payload.email,
    role: payload.role,
    title: payload.title || (payload.role === 'admin' ? 'إدارة كاملة' : 'اطلاع فقط'),
    status: 'invited',
  });

  if (res && res.ok) {
    revalidatePath(`/staff/clients/${clientId}/contacts`);
    return { ok: true, contactId: res.contactId };
  }
  return { ok: false };
}
