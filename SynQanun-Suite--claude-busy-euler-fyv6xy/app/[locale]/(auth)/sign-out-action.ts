'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { DEMO_VIEWER_COOKIE } from '@/lib/demo-viewer';

export async function signOutAction(): Promise<{ ok: boolean }> {
  try {
    const jar = await cookies();
    jar.delete('syn-auth-token');
    jar.delete(DEMO_VIEWER_COOKIE);
  } catch (err) {
    console.error('Error in signOutAction:', err);
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}
