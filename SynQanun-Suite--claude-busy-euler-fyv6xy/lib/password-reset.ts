/**
 * The password reset flow, split out of lib/mock-api.ts.
 *
 * ===========================================================================
 * WHY THIS IS NOT IN mock-api.ts LIKE EVERYTHING ELSE
 * ===========================================================================
 * Three of these calls are made from CLIENT components — the request form, the
 * new-password form and the resend button all run in the browser, because each
 * has to cancel a native submit. They were the only client-side callers of the
 * fake API in the whole product.
 *
 * That was harmless until `mockApi.staff.currentStaff()` needed to read the
 * demo viewer cookie. `next/headers` cannot be imported into a client bundle,
 * so a single module serving both sides stopped being possible: either the
 * rank switcher was impossible, or these three forms had to stop importing the
 * server-only module.
 *
 * Splitting them out is the better answer of the two, and it was arguably owed
 * anyway. mock-api.ts describes itself as the Track A/Track B seam — the file a
 * dev team replaces with real endpoints — and a seam that half the client can
 * import is not much of a seam. Everything left in it is now reachable only
 * from the server, which is enforced by the compiler rather than by convention.
 *
 * Server callers still reach these through `mockApi.passwordReset` and the
 * re-exported constant, so nothing on that side changed.
 */
import { demoClientAccount, demoStaffAccount, type PortalAccount } from '@/fixtures/accounts';
import { latency } from '@/lib/latency';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api';

let memoryResetToken: string | null = null;
let memoryResetEmail: string | null = null;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * How long a password reset link stays valid, in minutes.
 */
export const RESET_LINK_TTL_MINUTES = 15;

export const passwordReset = {
  /**
   * Begin a password reset with FastAPI PostgreSQL backend.
   */
  async request(email: string): Promise<{ ok: true }> {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          memoryResetToken = data.token;
          memoryResetEmail = data.email || email;
          if (typeof document !== 'undefined') {
            document.cookie = `syn_reset_token=${data.token}; path=/; max-age=900; SameSite=Lax`;
            document.cookie = `syn_reset_email=${encodeURIComponent(data.email || email)}; path=/; max-age=900; SameSite=Lax`;
          }
        }
      }
    } catch (e) {
      console.error('Password reset request error:', e);
    }
    return { ok: true };
  },

  /**
   * Re-send the reset email.
   */
  async resend(email: string): Promise<{ ok: true }> {
    return this.request(email);
  },

  /**
   * Resolve the account a reset token belongs to.
   */
  async resolveToken(
    token: string,
    side: PortalAccount['side'] = 'client'
  ): Promise<PortalAccount> {
    const tokenToUse =
      token && token !== 'reset_demo_token'
        ? token
        : memoryResetToken || getCookie('syn_reset_token');

    if (tokenToUse) {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/password-reset/verify/${tokenToUse}`);
        if (res.ok) {
          const data = await res.json();
          const base = side === 'staff' ? demoStaffAccount : demoClientAccount;
          return {
            ...base,
            id: 'resolved-user',
            email: data.email,
            side: data.side || side,
            name: { en: data.name || base.name.en, ar: data.name || base.name.ar },
          };
        }
      } catch (e) {
        console.error('Verify reset token error:', e);
      }
    }

    return side === 'staff' ? demoStaffAccount : demoClientAccount;
  },

  /**
   * Set the new password in PostgreSQL database.
   */
  async complete(token: string, password: string): Promise<{ ok: true }> {
    const tokenToUse =
      token && token !== 'reset_demo_token'
        ? token
        : memoryResetToken || getCookie('syn_reset_token');

    if (tokenToUse) {
      try {
        await fetch(`${BACKEND_URL}/auth/password-reset/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenToUse, password }),
        });
      } catch (e) {
        console.error('Complete reset error:', e);
      }
    }
    return { ok: true };
  },
};

