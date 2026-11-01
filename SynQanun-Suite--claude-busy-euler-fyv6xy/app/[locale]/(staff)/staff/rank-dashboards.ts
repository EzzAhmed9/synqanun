import type { Rank } from '@/lib/ranks';

/**
 * Which ranks have a dashboard, and therefore what /staff is allowed to render.
 *
 * ===========================================================================
 * WHY THE PAGE BODY NEEDS ITS OWN GATE
 * ===========================================================================
 * `staffNavFor()` in components/chrome/nav-items.ts gates the SIDEBAR. It does
 * not gate anything a route renders, and until this file existed nothing did:
 * /staff ran the Partner Dashboard for whoever was signed in. A paralegal got
 * a correctly filtered nav — no Billing, no Approvals — wrapped around a page
 * body showing the partner's approval queue, the firm's recorded hours and the
 * client list. The nav told the truth and the content contradicted it.
 *
 * That is the failure mode worth naming: hiding the ENTRANCE to privileged data
 * while the data itself renders one route over is not access control, it is
 * decoration. A gate has to sit where the data is read.
 *
 * ===========================================================================
 * AN ALLOW-LIST, LIKE THE NAV
 * ===========================================================================
 * Same direction as `StaffNavEntry.ranks`: a list of who DOES have a dashboard,
 * never a list of who does not. A rank that is not named here gets the
 * placeholder, which means adding a sixth rank — or adding this file's fourth
 * dashboard and forgetting to register it — fails closed and visibly, rather
 * than silently inheriting the partner's screen.
 *
 * ===========================================================================
 * "NOT BUILT" IS NOT "NOT ALLOWED"
 * ===========================================================================
 * This list says nothing about permission. Every rank is entitled to a
 * dashboard; four of them do not have one yet (BUILD_PLAN.md §3, "Staff core").
 * So the placeholder reads as an unfinished screen and NOT as a refusal — see
 * DashboardNotBuilt.tsx, which is deliberately not styled like a 403.
 *
 * When the Senior Associate dashboard lands, this array gains one entry and
 * page.tsx gains one branch. Nothing else moves.
 *
 * MOCK: in production the rank comes from the session and the gate is enforced
 * server-side before any query runs, which is the shape page.tsx already has —
 * the partner's data is not fetched at all unless the rank clears this check.
 * Track A.5.
 */
export const RANKS_WITH_DASHBOARD = [
  'partner',
  'seniorAssociate',
  'juniorAssociate',
  'paralegal',
  'legalSecretary',
] as const satisfies readonly Rank[];

export type RankWithDashboard = (typeof RANKS_WITH_DASHBOARD)[number];

/** Whether this rank's dashboard exists. */
export function hasDashboard(rank: Rank): rank is RankWithDashboard {
  return (RANKS_WITH_DASHBOARD as readonly Rank[]).includes(rank);
}
