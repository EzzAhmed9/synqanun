import type { Rank } from '@/lib/ranks';

/**
 * Who may take on a client.
 *
 * The CRM is open to every rank — a paralegal filing for a client needs to
 * know who that client is. Adding one is a different act: it is the firm
 * agreeing to act for an organisation, the point at which a conflict would
 * have to have been cleared, and the record every matter and every invoice
 * afterwards hangs off.
 *
 * ===========================================================================
 * WHY THIS IS NOT ../matters/permissions.ts
 * ===========================================================================
 * The two lists are identical today, and deliberately separate anyway. They
 * answer different questions — "who may open a file for a client we already
 * act for" and "who may accept a client at all" — and a firm can reasonably
 * answer them differently: letting senior associates open matters while
 * reserving new clients to the partnership is an ordinary arrangement.
 *
 * Merging them would make that a code change instead of a data one, and would
 * mean one rule silently moving two decisions. The project's rule about
 * extracting at the second instance is about repeated SHAPES, not about
 * collapsing two policies that happen to agree.
 *
 * MOCK: a server-side authorisation check on a verified session at Track A.5.
 */
export const CLIENT_OPENER_RANKS = ['partner', 'seniorAssociate'] as const satisfies readonly Rank[];

export function canAddClient(rank: Rank): boolean {
  return (CLIENT_OPENER_RANKS as readonly Rank[]).includes(rank);
}

/**
 * Who may put a person at a client into the portal.
 *
 * READING the contact list is open to every rank, the same way the CRM is: a
 * paralegal who emails the client's finance manager every week needs to know
 * whether that person can see an invoice for themselves. Deciding that a named
 * individual may read their employer's privileged files is a different act, and
 * it is the one the firm answers for.
 *
 * SAME LIST AS `CLIENT_OPENER_RANKS`, SEPARATE ON PURPOSE — for the reason the
 * header above gives about ../matters/permissions.ts, which applies again here.
 * "Who may accept a client at all" and "who may extend that client's access to
 * another person" are genuinely different questions, and a firm can reasonably
 * answer them differently: reserving new clients to the partnership while the
 * senior associate running the file adds the client's CFO to the portal is an
 * ordinary arrangement. Merging them would make that a code change.
 *
 * NOTHING IS ENFORCED BY THIS GATE TODAY, because the control it governs sends
 * nothing — see InviteContactModal.tsx. It is drawn anyway, so the screen says
 * who owns the decision rather than implying it is everyone's.
 *
 * MOCK: a server-side authorisation check on a verified session at Track A.5,
 * re-run on the endpoint and not inferred from a button having been rendered.
 */
export const CLIENT_PORTAL_INVITER_RANKS = [
  'partner',
  'seniorAssociate',
] as const satisfies readonly Rank[];

export function canInviteClientContact(rank: Rank): boolean {
  return (CLIENT_PORTAL_INVITER_RANKS as readonly Rank[]).includes(rank);
}
