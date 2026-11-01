'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { backendBridge } from '@/lib/backend-bridge';
import { DEMO_VIEWER_COOKIE } from '@/lib/demo-viewer';

export async function signInAction(email: string, password: string): Promise<{
  ok: boolean;
  error?: string;
  side?: string;
  redirectUrl?: string;
}> {
  console.log('[signInAction] Received sign in attempt for:', email);
  if (!email || !password) {
    return { ok: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' };
  }

  const result = await backendBridge.auth.login(email, password);
  console.log('[signInAction] backend login result:', result);

  if (!result.ok || !result.data) {
    return {
      ok: false,
      error: result.error === 'Incorrect email or password'
        ? 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور'
        : result.error || 'فشل تسجيل الدخول',
    };
  }

  const { access_token, user } = result.data;
  const jar = await cookies();

  // 1. Set JWT auth token cookie
  jar.set('syn-auth-token', access_token, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });

  // 2. Set user/viewer cookie so all server components render as this person
  if (user?.id) {
    jar.set(DEMO_VIEWER_COOKIE, user.id, {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  revalidatePath('/', 'layout');

  const isClient = user?.side === 'client';
  return {
    ok: true,
    side: user?.side || 'staff',
    redirectUrl: isClient ? '/client' : '/staff',
  };
}
