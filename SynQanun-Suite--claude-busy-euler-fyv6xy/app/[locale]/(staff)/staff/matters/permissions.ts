import type { Rank } from '@/lib/ranks';

/**
 * Who may open a matter.
 *
 * The Matters nav entry has no `ranks` allow-list: every fee earner works on
 * files and the register is theirs to read. Opening one is a different act.
 * It commits the firm to act for a client, it is the point at which a conflict
 * would have to have been cleared, and it creates the record every invoice on
 * that work will hang off.
 *
 * So the screen is open and the action is not — the same split Team & Roster
 * draws between reading the roster and changing it, and stated here for the
 * same reason: two callers need it. The register decides whether to render the
 * link, and the Server Action decides whether to honour the request, because a
 * link that was never drawn stops nobody.
 *
 * Partner and senior associate, matching Billing and Approvals. A senior
 * associate runs files of their own and instructs on them; a junior associate
 * or a paralegal works on a file somebody else opened.
 *
 * MOCK: a server-side authorisation check on a verified session at Track A.5,
 * not a component reading an array.
 */
export const MATTER_OPENER_RANKS = ['partner', 'seniorAssociate'] as const satisfies readonly Rank[];

export function canOpenMatter(rank: Rank): boolean {
  return (MATTER_OPENER_RANKS as readonly Rank[]).includes(rank);
}

/**
 * Who may reopen a closed matter from the Archive.
 *
 * Partners only, as the client asked (October 2026). Reopening puts a closed
 * file back in hand — work, time and fee statements can hang off it again —
 * which is a decision about the firm's book rather than about one file's next
 * step. The Archive tab is readable by every rank; the Reopen control is drawn
 * only for this one, and the Server Action checks again.
 */
export const MATTER_REOPENER_RANKS = ['partner'] as const satisfies readonly Rank[];

export function canReopenMatter(rank: Rank): boolean {
  return (MATTER_REOPENER_RANKS as readonly Rank[]).includes(rank);
}
