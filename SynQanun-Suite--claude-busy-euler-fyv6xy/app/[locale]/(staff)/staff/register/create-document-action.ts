'use server';

import { mockApi, type CreateDocumentResult } from '@/lib/mock-api';

/**
 * Start a document on an engagement.
 *
 * ===========================================================================
 * WHY A SERVER ACTION
 * ===========================================================================
 * The session store lives in the Next process. A client-side array would be
 * per-tab and would vanish on navigation, which is a worse lie than the one
 * the session store already carries — and the card that shows the result is
 * server-rendered, so it has to be the server that knows.
 *
 * It is also a POST rather than a GET, which matters here for the same reason
 * it does on the conflicts search: a document title on a live matter names
 * what the firm is preparing and against whom. "Skeleton argument — second
 * draft" in an address bar is in browser history and in every proxy log
 * between here and the server.
 *
 * ===========================================================================
 * NO RANK GATE, STATED RATHER THAN OMITTED
 * ===========================================================================
 * Every other write in Batch 6 carries an allow-list, so the absence of one
 * here is a decision and not an oversight. Starting a draft on a file is the
 * most ordinary act in a law firm and every rank in this product does it: a
 * paralegal prepares the bundle index, a legal secretary prepares the
 * correspondence, and a rule that let only fee earners create a document would
 * describe a firm that does not exist.
 *
 * What is gated is what the record LEADS to, and none of that is here.
 * Nothing in this flow shares the draft with anyone, bills for it, or files it.
 *
 * The engagement is not gated either, because the registers are not: anyone who
 * can open MAT-2201 can see what is being drafted on it. The check that DOES
 * run is that the reference resolves — see `createDocument`, which refuses a
 * reference the caller invented rather than storing an orphan.
 *
 * MOCK: at Track A.5 this is a POST against the firm's DMS, authorised on a
 * verified session. The absence of a rank check becomes a deliberate policy
 * recorded there rather than an absence.
 */
export async function createDocument(input: {
  title: string;
  type: string;
  engagementRef: string;
}): Promise<CreateDocumentResult> {
  // Validation lives in the data layer, next to the collections it validates
  // against — the type list and the engagement index both live there.
  return mockApi.staff.createDocument(input);
}
