import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'syn-auth-token';

/**
 * Returns raw JWT bearer token from httpOnly cookie on the server side.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE_NAME)?.value;
    return token || null;
  } catch {
    // Outside Next.js request context (e.g. build time or client environment)
    return null;
  }
}

/**
 * Returns standard request headers carrying Bearer authentication token
 * read directly from the secure httpOnly cookie.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
