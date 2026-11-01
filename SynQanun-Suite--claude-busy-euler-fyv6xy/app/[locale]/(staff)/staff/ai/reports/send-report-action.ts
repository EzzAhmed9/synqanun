'use server';

import { mockApi, type ReportSendResult } from '@/lib/mock-api';
import { canApproveReportSend } from './permissions';

/*
 * The two writes behind "Send" on a client report. NOTHING IS SENT by either:
 * a request waits for a partner, and an approval leaves it queued, which the
 * screen labels "Queued: demo". The actor is always the session's, never a
 * field of the request, so neither line can be written in someone else's name.
 */

/** Prepare a send and ask a partner to approve it. Any fee earner may ask. */
export async function requestReportSend(input: {
  reference: string;
  channels: string[];
}): Promise<ReportSendResult> {
  const me = await mockApi.staff.currentStaff();
  return mockApi.staff.requestReportSend({ ...input, staffId: me.id });
}

/** A partner's approval. Re-checked here: a Server Action is a public endpoint. */
export async function approveReportSend(reference: string): Promise<ReportSendResult> {
  const me = await mockApi.staff.currentStaff();
  if (!canApproveReportSend(me.rank)) return { ok: false, error: 'notPermitted' };
  return mockApi.staff.approveReportSend({ reference, staffId: me.id });
}
