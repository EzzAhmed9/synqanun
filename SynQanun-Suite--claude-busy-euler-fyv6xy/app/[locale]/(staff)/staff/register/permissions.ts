import type { Rank } from '@/lib/ranks';

/**
 * Who may change who leads a file.
 *
 * ===========================================================================
 * PARTNERS ONLY, AND NOT THE SAME QUESTION AS WHO MAY LEAD
 * ===========================================================================
 * Two different lists live either side of this action. `LEAD_ELIGIBLE_RANKS`
 * in lib/ranks.ts says who can be PUT in charge — partners and senior
 * associates. This says who may DO the putting, and it is narrower.
 *
 * The reason is what reassignment is. It is not work on a file; it is deciding
 * who answers for one, which is how a firm allocates its own responsibility.
 * A senior associate who could move a matter off themselves and onto a
 * colleague is a senior associate who can decline work by reassigning it, and
 * that is a conversation rather than a control.
 *
 * ===========================================================================
 * IT IS ALSO THE FIRST BULK WRITE
 * ===========================================================================
 * Every other gate in this product guards one record at a time. This one
 * guards an action whose whole purpose is to touch several at once, and the
 * lead it changes is read on four screens. A narrower list is the right
 * default for a control with that reach.
 *
 * MOCK: a server-side authorisation check on a verified session at Track A.5.
 */
export const LEAD_REASSIGNER_RANKS = ['partner'] as const satisfies readonly Rank[];

export function canReassignLead(rank: Rank): boolean {
  return (LEAD_REASSIGNER_RANKS as readonly Rank[]).includes(rank);
}
