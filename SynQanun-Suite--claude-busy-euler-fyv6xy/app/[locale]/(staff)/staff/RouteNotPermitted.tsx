import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { StaffTopBar } from '../StaffChrome';

/**
 * What a gated staff route renders for a rank the nav does not offer it to.
 *
 * ===========================================================================
 * THIS IS A PERMISSION, WHICH DashboardNotBuilt IS NOT
 * ===========================================================================
 * DashboardNotBuilt argues at length that a missing screen must not be dressed
 * up as a refusal, because telling a paralegal "restricted" when the truth is
 * "unfinished" is a lie about them. This is the opposite case and gets the
 * opposite treatment: the firm's ledger and its partners' decisions genuinely
 * are not everyone's to read, the nav has said so by omitting the entry, and
 * the honest answer is that this is above the reader's rank — not that it is
 * broken.
 *
 * ===========================================================================
 * IT NAMES NO RECORD
 * ===========================================================================
 * "There is a screen here and it is not yours" discloses firm structure, which
 * everyone on the staff already knows. A COUNT would disclose the thing being
 * withheld — "4 approvals you may not see" is a worse answer than none — so
 * nothing that reaches this component has been fetched. The gate runs before
 * the queries; see the routes that use it.
 *
 * Extracted at the second instance. Billing built it, approvals is the second
 * gated route, and a third would otherwise be the third slightly different
 * apology.
 */
export function RouteNotPermitted({
  icon,
  pageTitle,
  subtitle,
  title,
  body,
}: {
  /** The same icon the sidebar uses for this route, so the page names itself. */
  icon: LucideIcon;
  /** The screen, in the top bar — the same words its nav entry uses. */
  pageTitle: string;
  subtitle: string;
  /** The refusal, in the empty state. */
  title: string;
  body: string;
}) {
  return (
    <>
      {/* The chrome stays. Someone landing here should see a workspace with
          one screen closed to them, not a dead end that reads as a crash. */}
      <StaffTopBar title={pageTitle} subtitle={subtitle} />
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-6 py-6">
        <EmptyState icon={icon} title={title} body={body} />
      </main>
    </>
  );
}

export default RouteNotPermitted;
