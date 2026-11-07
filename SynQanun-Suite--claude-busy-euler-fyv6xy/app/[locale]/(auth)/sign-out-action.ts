'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { DEMO_VIEWER_COOKIE } from '@/lib/demo-viewer';
import { backendBridge } from '@/lib/backend-bridge';

export async function signOutAction(): Promise<{ ok: boolean }> {
  try {
    // 1. Revoke active JWT session on the backend server
    await backendBridge.auth.logout();

    // 2. Clear client-side httpOnly cookies
    const jar = await cookies();
    jar.delete('syn-auth-token');
    jar.delete(DEMO_VIEWER_COOKIE);
  } catch (err) {
    console.error('Error in signOutAction:', err);
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
