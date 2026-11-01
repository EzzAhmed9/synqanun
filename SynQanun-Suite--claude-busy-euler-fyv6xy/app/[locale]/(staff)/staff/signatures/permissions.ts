import type { Rank } from '@/lib/ranks';

/**
 * Who may prepare a signature request.
 *
 * ===========================================================================
 * A GENUINELY DIFFERENT LIST FROM THE OTHER FOUR
 * ===========================================================================
 * Partner, senior associate AND junior associate — not the partner/senior pair
 * that opens matters, takes on clients and raises fee statements, and not the
 * partners-only list that manages the roster.
 *
 * The reason is what the act is. Asking a client to execute a document is a
 * step in running the file rather than a commitment of the firm: the associate
 * running a transaction assembles the execution pack and decides who signs
 * what, and a rule that sent them to a partner for it would describe a slower
 * firm than any of these fixtures depict — MAT-1940 and MAT-1104 are led by a
 * senior associate, and juniors are on the files under them.
 *
 * ===========================================================================
 * WHY THE PARALEGAL AND THE LEGAL SECRETARY ARE NOT IN IT
 * ===========================================================================
 * Not because the work is beyond them — both of them prepare execution packs in
 * every real firm. Because of who the request is ADDRESSED to. This names an
 * individual at the client and asks them to put their name to an instrument,
 * and getting the signatory wrong is a defect in the document rather than an
 * administrative slip. That judgement sits with somebody who can be wrong about
 * it professionally.
 *
 * ===========================================================================
 * THE SEND IS NOT GATED HERE, BECAUSE THE SEND IS NOT BUILT
 * ===========================================================================
 * This list governs PREPARING the request. Actually asking the client is a
 * category 2 act with no implementation anywhere in this product — there is no
 * signature provider (fixtures/integrations.ts says so on a shipped screen) and
 * BUILD_PLAN.md §6 puts that integration in Track B. When it exists it gets its
 * own, narrower gate, and this one does not quietly become it.
 *
 * MOCK: a server-side authorisation check on a verified session at Track A.5.
 */
export const SIGNATURE_REQUESTER_RANKS = [
  'partner',
  'seniorAssociate',
  'juniorAssociate',
] as const satisfies readonly Rank[];

export function canRequestSignature(rank: Rank): boolean {
  return (SIGNATURE_REQUESTER_RANKS as readonly Rank[]).includes(rank);
}
