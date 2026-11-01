'use server';

import { mockApi, type StaffSearchResults } from '@/lib/mock-api';

/**
 * The firm's global search, called from the staff overlay.
 *
 * ===========================================================================
 * THE RANK IS READ HERE, NOT PASSED IN
 * ===========================================================================
 * This is the single most important line in the file. A Server Action is a
 * PUBLIC ENDPOINT — the overlay is the only thing that calls it today, but
 * anybody can post to it, and a rank taken as an argument would be a rank the
 * caller chooses. It is read from `currentStaff()` instead, exactly as every
 * other gated action in this codebase does.
 *
 * What that gate protects is real: `staffSearch` withholds the firm's invoices
 * from a rank that may not read the billing screen. A search box that reached
 * past that gate would hand somebody the contents of a screen they were refused,
 * one row at a time — which is worse than the screen, because nobody would think
 * to check.
 *
 * ===========================================================================
 * WHY A SERVER ACTION AND NOT A `useMemo`, THE STAFF VERSION
 * ===========================================================================
 * The client portal's search-action.ts makes this argument for one client's own
 * records. On this side it is stronger, and the difference is worth stating:
 * filtering in the browser would ship EVERY CLIENT'S matters, every invoice the
 * firm has raised and every internal draft into the bundle, so that a search box
 * could hide most of them. The disclosure would be the whole firm, not one
 * client's file, and it would sit in the bundle whether or not anybody opened
 * the search.
 *
 * And the query stays out of the URL for the same reason it does on the client
 * side, with a different party at risk. A fee earner's search terms are the
 * names of clients, counterparties and matters the firm may not have taken on
 * yet — "conflict Al-Noor" typed before a pitch is a disclosure about both the
 * firm and the prospect. A Server Action is a POST, so it travels in the body:
 * no history entry, no Referer, no access log.
 *
 * That is also why there is no `?q=`, no deep link to a result set, and no
 * recent-searches list.
 *
 * MOCK: wraps the fixture search. At Track A.5 this becomes a call to the real
 * endpoint and the rank scoping moves INTO the query rather than filtering what
 * a function happened to read.
 */
export async function runStaffSearch(query: string): Promise<StaffSearchResults> {
  const me = await mockApi.staff.currentStaff();
  return mockApi.staff.staffSearch(query, me.rank);
}
