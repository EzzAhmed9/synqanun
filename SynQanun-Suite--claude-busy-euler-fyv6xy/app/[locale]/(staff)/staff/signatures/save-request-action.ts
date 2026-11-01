'use server';

import { mockApi, type SaveSignatureRequestResult } from '@/lib/mock-api';
import { canRequestSignature } from './permissions';

/**
 * Write down a signature request the firm intends to make.
 *
 * ===========================================================================
 * THE GATE RUNS HERE BECAUSE THIS IS A PUBLIC ENDPOINT
 * ===========================================================================
 * `canRequestSignature` — see ./permissions.ts, which explains why this list is
 * a different one from the four already in the product rather than a copy of
 * the nearest. A route that refuses to render for a paralegal does nothing
 * about a paralegal calling this directly.
 *
 * ===========================================================================
 * WHO PREPARED IT IS NOT AN ARGUMENT
 * ===========================================================================
 * The session decides, the same way the time ledger and the invoice builder
 * decide. A record of who chose the signatories is worth nothing if the caller
 * supplies the name.
 *
 * ===========================================================================
 * AND THERE IS NO SEND ACTION IN THIS FILE
 * ===========================================================================
 * Not "there is one and it returns early" — there is no function. Sending is
 * BUILD_PLAN.md §5.1 category 2 with no provider behind it, and the screen's
 * button says so where it was pressed rather than calling an endpoint that
 * politely declines.
 *
 * MOCK: at Track A.5 this is a POST on a verified session. The send becomes a
 * real provider call at Track B (§6), with its own narrower gate.
 */
export async function saveSignatureRequest(input: {
  documentId: string;
  signers: { contactId: string; fields: string[] }[];
  note: string;
}): Promise<SaveSignatureRequestResult> {
  const me = await mockApi.staff.currentStaff();

  if (!canRequestSignature(me.rank)) {
    return { ok: false, error: 'notPermitted' };
  }

  return mockApi.staff.saveSignatureRequest({ ...input, preparedById: me.id });
}
