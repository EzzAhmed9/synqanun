'use server';

import { mockApi, type SearchResults } from '@/lib/mock-api';

/**
 * The client portal's global search, called from the overlay.
 *
 * WHY A SERVER ACTION AND NOT A `useMemo`
 * ---------------------------------------------------------------------------
 * Two reasons, and the second is the one that made this file exist rather than
 * a filter inside the component.
 *
 * 1. THE DATA STAYS ON THE SERVER. Filtering in the browser means shipping every
 *    matter, invoice, document and message body into the bundle so the search
 *    box can hide most of them. See the note on `search.query` in
 *    lib/mock-api.ts — that is a disclosure, not an optimisation question, and
 *    it would be in the bundle whether or not anyone opened the search.
 *
 * 2. THE QUERY IS NOT A URL. A Server Action is a POST: the search term goes in
 *    the request body. Every other filter in this portal lives in the URL on
 *    purpose — `?status=overdue` and `?thread=` are views, they are linkable and
 *    they are worth putting in history. A SEARCH TERM IS NOT A VIEW. It is
 *    something the client typed about their own legal affairs: "Al-Noor
 *    settlement", the name of a counterparty they have not sued yet, a sum. In a
 *    URL that lands in browser history on a machine that may be shared, in the
 *    next Referer header, and in any access log between here and the server.
 *
 *    This is the same rule the documents library's filter box and the messages
 *    composer already follow, applied to the one box that searches everything.
 *
 * That is also why there is no `?q=` to make the overlay deep-linkable and no
 * "recent searches" list, which the Stitch export shows in its footer. A stored
 * history of what a client searched for is exactly the artefact the paragraph
 * above is trying not to create, and a prototype with no session to scope it to
 * would have to keep it in `localStorage`, which is worse. If the firm wants it,
 * it belongs server-side against an authenticated session, with a retention
 * policy and a way to clear it — a product decision, not a UI detail.
 *
 * MOCK: this wraps the fixture search. It becomes a call to the real endpoint at
 * Track A.5, and the scoping to the authenticated client has to move into the
 * query at the same time — right now nothing here checks WHO is asking, because
 * there is no session to ask about. That is the single most important line in
 * this file to not forget.
 */
export async function runGlobalSearch(query: string): Promise<SearchResults> {
  return mockApi.search.query(query);
}
