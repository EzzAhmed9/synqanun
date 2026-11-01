import { demoFirm } from './firm';
import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/invites.ts — pending CLIENT portal invitations.
 *
 * Created because Accept Invite needs it, not ahead of time. BUILD_PLAN.md's
 * fixture files arrive with the batch that consumes them.
 *
 * CLIENT-SIDE ONLY. There is no staff equivalent and none should be added.
 * BUILD_PLAN.md §3.1: staff are provisioned by temporary password — generated
 * when they are added in the onboarding wizard or Team/Roster, used to sign in
 * normally at the Firm Gateway, and changed through the ordinary staff
 * password reset flow. There is no staff Accept Invite screen, so there is no
 * staff invitation to model. This file once carried a `demoStaffInvite` and an
 * `audience: 'client' | 'staff'` union; both were removed when that decision
 * landed, precisely so nobody finds them later and infers that staff invites
 * are supported.
 *
 * The firm is NOT restated here: `firmId` points at fixtures/firm.ts, which
 * remains the single source of truth for the demo firm's name in both
 * languages. No fixture should ever contain the string "MR and Partners".
 */

export interface Invite {
  /**
   * The opaque token from the invitation URL.
   *
   * MOCK: in production this is a signed, single-use, expiring token, and the
   * server must verify it before rendering anything — an unverified token means
   * an attacker can enumerate invitee names and email addresses. Track A.5,
   * with real authentication. Track A never validates it.
   */
  token: string;
  /**
   * Which gateway the invitee lands in once activated.
   *
   * Only ever `'client'`. Kept as a field rather than dropped so the payload
   * still says out loud which side of the product an invitation belongs to —
   * but deliberately NOT a union, so a staff invitation cannot be expressed.
   * See the file header and BUILD_PLAN.md §3.1.
   */
  audience: 'client';
  /** Tenant this invitation belongs to — see fixtures/firm.ts. */
  firmId: string;
  /**
   * The invited person's email.
   *
   * Fixed to the invitation and rendered read-only: letting the invitee edit it
   * would turn an invite into an open registration form for the tenant.
   */
  email: string;
  /** Invitee's display name, per locale. */
  inviteeName: Record<Locale, string>;
  /**
   * Organisation the invitee represents, per locale.
   *
   * `null` when the client is an individual rather than a corporate contact —
   * a private client instructing the firm in their own name has no organisation
   * to show, and rendering an empty label would be worse than rendering none.
   */
  inviteeOrganisation: Record<Locale, string> | null;
  /** Who at the firm sent the invitation, per locale. */
  invitedBy: Record<Locale, string>;
  /**
   * ISO 8601 with an explicit offset.
   *
   * Always render this with an explicit `timeZone` (the tenant's, not the
   * viewer's) — see the formatter on the Accept Invite screen. Formatting an
   * instant in whatever timezone the runtime happens to be in makes the date
   * drift by a day near midnight, and makes the server and client renders
   * disagree, which is a hydration error waiting to happen.
   */
  expiresAt: string;
}

// MOCK: replace with GET /api/invites/:token — server-side token verification,
// expiry and single-use checks, then a scoped payload containing only what the
// activation screen may display. Nothing here is validated in Track A.
export const demoClientInvite: Invite = {
  token: 'inv_7Kq2wE9bXr4T',
  audience: 'client',
  firmId: demoFirm.id,
  email: 't.alrahman@gulfholdings.ae',
  inviteeName: {
    en: 'Tarek Al-Rahman',
    ar: 'طارق الرحمن',
  },
  inviteeOrganisation: {
    en: 'Gulf Holdings',
    ar: 'الخليج القابضة',
  },
  invitedBy: {
    en: 'Mona Roshdy',
    ar: 'منى رشدي',
  },
  // Africa/Cairo is UTC+3 on this date. The offset must match the tenant's
  // zone, or the rendered expiry is a day out.
  expiresAt: '2026-09-30T23:59:59+03:00',
};
