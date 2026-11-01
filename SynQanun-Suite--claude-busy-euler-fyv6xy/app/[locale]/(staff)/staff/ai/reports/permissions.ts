import type { Rank } from '@/lib/ranks';

/**
 * Who may approve a client report for sending.
 *
 * Partners, as the client asked (October 2026): anything that goes out to a
 * client in the firm's name needs a partner's sign-off first. Any fee earner
 * may prepare the send and ask; only this rank sees the Approve control, and
 * the Server Action checks again.
 */
export const REPORT_APPROVER_RANKS = ['partner'] as const satisfies readonly Rank[];

export function canApproveReportSend(rank: Rank): boolean {
  return (REPORT_APPROVER_RANKS as readonly Rank[]).includes(rank);
}
