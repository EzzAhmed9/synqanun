import { PORTAL_CLIENT_ID, demoClients } from './clients';
import { demoFirm } from './firm';
import type { Locale } from '@/lib/i18n/routing';

/**
 * fixtures/accounts.ts — existing portal accounts.
 *
 * Distinct from fixtures/invites.ts on purpose. An invitation is a pending
 * thing with a token and an expiry; an account is someone who already has
 * access. The password reset flow acts on the second, not the first, so
 * reusing the invite fixture here would have quietly conflated them.
 *
 * The firm is not restated — `firmId` points at fixtures/firm.ts.
 */

export interface PortalAccount {
  id: string;
  /** Tenant this account belongs to — see fixtures/firm.ts. */
  firmId: string;
  /** Which side of the product this account signs in to. */
  side: 'client' | 'staff';
  /**
   * The client organisation this account signs in on behalf of — an id into
   * fixtures/clients.ts. Absent for staff, who sign in on behalf of the firm.
   *
   * THIS IS WHAT EVERY CLIENT-PORTAL QUERY SCOPES ON. An engagement names its
   * client; an account names the client it represents; the portal returns the
   * intersection. Before this field existed, matters and projects pointed
   * BACK at the account (`clientAccountId`), which made "the firm acts for
   * this organisation" and "this person may sign in" the same fact — so a
   * client without a portal login could not have any work, and a portal read
   * that forgot to filter returned every client's files with no way to tell.
   *
   * MOCK: resolved from the authenticated session server-side, and enforced
   * there on every query. A scope the client sends is not a scope. Track A.5.
   */
  clientId?: string;
  email: string;
  name: Record<Locale, string>;
  /**
   * The person's job title at their own organisation, per locale.
   *
   * Added when the Client Dashboard's top bar needed to show who is signed in.
   * It belongs here rather than on a matter or an invite because it is a
   * property of the account holder, not of any one file they can see.
   *
   * Optional: a private client instructing the firm in their own name has no
   * title to show, and rendering an empty line would be worse than rendering
   * none — the same reasoning as `inviteeOrganisation` in fixtures/invites.ts.
   */
  title?: Record<Locale, string>;
  /**
   * The organisation the account holder represents, per locale. Absent for an
   * individual client and for staff, who represent the firm itself.
   */
  organisation?: Record<Locale, string>;
  /**
   * Direct line, as the account holder wants to be reached.
   *
   * Added with the Settings screen, which is the first surface where a client
   * maintains their own contact details rather than reading the firm's.
   *
   * Note the country code is the CLIENT's, not the firm's. The firm is in Cairo
   * and every firm-side number in these fixtures is `+20`; Gulf Holdings is an
   * Emirati company and its people carry `+971`. The two being different is
   * correct — it was only wrong when the export gave the CAIRO firm UAE numbers.
   */
  phone?: string;
}

/**
 * The client record this demo account belongs to.
 *
 * Looked up rather than assumed present: if the client were removed the
 * account simply has no organisation to show, which is the same state a
 * private client instructing the firm in their own name is already in.
 */
const portalClient = demoClients.find((client) => client.id === PORTAL_CLIENT_ID);

// MOCK: replace with the authenticated account, or with the account resolved
// from a verified reset token. Track A.5, with real authentication.
export const demoClientAccount: PortalAccount = {
  id: 'acct-client-tarek',
  firmId: demoFirm.id,
  side: 'client',
  clientId: PORTAL_CLIENT_ID,
  email: 't.alrahman@gulfholdings.ae',
  name: {
    en: 'Tarek Al-Rahman',
    ar: 'طارق الرحمن',
  },
  title: {
    en: 'Managing director',
    ar: 'العضو المنتدب',
  },
  // The CLIENT owns its own name — fixtures/clients.ts. Written here too, it
  // would be a second copy free to drift from the one the CRM renders.
  organisation: portalClient?.name,
  phone: '+971 50 892 4110',
};

/* ===========================================================================
 * The client organisation's own roster
 * ======================================================================== */

/**
 * What a colleague can do inside the client portal.
 *
 * Two values, because a client organisation genuinely has two kinds of person
 * in it: the one who authorises things and the ones who need to read them. The
 * portal has always assumed more than one — fixtures/messages.ts notes that two
 * people at the same client do not share one read cursor — but Settings is the
 * first screen where that assumption becomes visible.
 *
 * MOCK: these are labels on a fixture, NOT access control. Nothing in Track A
 * enforces them: there is no authentication, so there is no one to enforce them
 * against. The real roles gate server-side, on every request, and the Track B
 * hardening pass (BUILD_PLAN.md §6) reviews that they actually do — a UI that
 * hides a button is not a permission. Track A.5.
 */
export type ClientRole = 'admin' | 'member';

/** Whether they have taken up their access yet. */
export type ClientAccessStatus = 'active' | 'invited';

export interface ClientTeamMember {
  /** Matches `PortalAccount.id` for someone who has an account. */
  id: string;
  /**
   * The client organisation this person belongs to — an id into
   * fixtures/clients.ts.
   *
   * IMPLICIT UNTIL THE FIRM'S OWN SIDE READ THIS LIST. The client portal always
   * scoped the roster on the signed-in account, so "which organisation is
   * this?" never had to be asked out loud. A staff screen showing one client's
   * contacts has to ask it per client, and the answer cannot be "the one client
   * that happens to have a portal" — that is true today and silently wrong the
   * moment a second one does.
   *
   * Writing it down also let `settings.team()` start FILTERING rather than
   * returning the whole array, which is the scoping this file's own MOCK note
   * asks for and could not express before.
   */
  clientId: string;
  name: Record<Locale, string>;
  /** Their job title at the client organisation, per locale. */
  title: Record<Locale, string>;
  email: string;
  role: ClientRole;
  status: ClientAccessStatus;
}

/**
 * People at the client organisation with access to this portal.
 *
 * MOCK: replace with GET /api/client/team, scoped to the authenticated
 * account's own organisation. A roster is a list of who can read privileged
 * files, so the scoping is the feature. Track A.5.
 *
 * The signed-in account is in here rather than alongside: they are one of the
 * people on the roster, and rendering them separately is how a list ends up
 * disagreeing with its own count.
 */
export const demoClientTeam: ClientTeamMember[] = [
  {
    id: demoClientAccount.id,
    clientId: PORTAL_CLIENT_ID,
    name: demoClientAccount.name,
    title: { en: 'Managing director', ar: 'العضو المنتدب' },
    email: demoClientAccount.email,
    role: 'admin',
    status: 'active',
  },
  {
    id: 'acct-client-nadia',
    clientId: PORTAL_CLIENT_ID,
    name: { en: 'Nadia Shukri', ar: 'نادية شكري' },
    title: { en: 'Chief financial officer', ar: 'المديرة المالية' },
    email: 'n.shukri@gulfholdings.ae',
    role: 'admin',
    status: 'active',
  },
  {
    id: 'acct-client-omar',
    clientId: PORTAL_CLIENT_ID,
    name: { en: 'Omar Fahmy', ar: 'عمر فهمي' },
    title: { en: 'Head of corporate development', ar: 'رئيس التطوير المؤسسي' },
    email: 'o.fahmy@gulfholdings.ae',
    role: 'member',
    status: 'active',
  },
  {
    id: 'acct-client-layla',
    clientId: PORTAL_CLIENT_ID,
    name: { en: 'Layla Mansour', ar: 'ليلى منصور' },
    title: { en: 'Senior legal counsel', ar: 'المستشارة القانونية الأولى' },
    email: 'l.mansour@gulfholdings.ae',
    role: 'member',
    // Invited and not yet activated — the one row that shows the second status,
    // and the same pending state fixtures/invites.ts models for the firm's own
    // invitation to this client.
    status: 'invited',
  },
];

/**
 * A staff account at the demo firm, for the staff-side password reset.
 *
 * Staff genuinely do reset passwords — BUILD_PLAN.md §3.1 step 3 makes the
 * ordinary reset flow the way they change the temporary password they were
 * provisioned with. That is why this exists while `demoStaffInvite` does not:
 * staff have accounts, they just never have invitations.
 *
 * The email uses the firm's own domain from fixtures/firm.ts rather than
 * restating it, so a change to the tenant's domain does not leave this
 * address pointing at the old one.
 */
export const demoStaffAccount: PortalAccount = {
  id: 'acct-staff-mona',
  firmId: demoFirm.id,
  side: 'staff',
  email: `m.roshdy@${demoFirm.domain}`,
  name: {
    en: 'Mona Roshdy',
    ar: 'منى رشدي',
  },
};
