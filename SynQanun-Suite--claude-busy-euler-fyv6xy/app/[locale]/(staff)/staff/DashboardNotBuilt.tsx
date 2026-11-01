import { LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EmptyState } from '@/components/ui';
import { StaffTopBar } from '../StaffChrome';

/**
 * What /staff renders for a rank whose dashboard does not exist yet.
 *
 * ===========================================================================
 * IT IS NOT A 403, AND THE DIFFERENCE IS THE WHOLE POINT
 * ===========================================================================
 * app/[locale]/not-found.tsx argues at length that a portal must not confirm
 * the existence of a record it will not show. This screen is the opposite case
 * and gets the opposite treatment: the reader is a member of the firm, the
 * dashboard they are asking for is theirs by right, and the only reason they
 * cannot see it is that nobody has built it. Dressing that up as a permission
 * refusal would tell a paralegal they are not trusted, when the true statement
 * is that the product is unfinished.
 *
 * So: no lock icon, no "restricted", no error colour, no status code. A plain
 * empty state, the same one the client portal uses for a list with nothing in
 * it, and a body that says which screen is missing and why the partner's is not
 * being substituted for it.
 *
 * ===========================================================================
 * WHY IT NAMES WHAT IT IS WITHHOLDING
 * ===========================================================================
 * The body says the partner's dashboard exists and that approvals, hours and
 * the client list are on it. That is firm-structure, not firm data — every
 * person on this staff already knows partners approve filings — and saying it
 * is what keeps the screen from reading as a fault in the reader's account.
 * No count, no name and no record crosses over.
 *
 * ===========================================================================
 * THE CHROME STAYS
 * ===========================================================================
 * <StaffTopBar> still renders, so the greeting, the rank and the rank-filtered
 * sidebar are all present. Someone landing here should see a workspace with one
 * screen missing, not a dead end that looks like a crash.
 */
export function DashboardNotBuilt({ firstName }: { firstName: string }) {
  const t = useTranslations('staffDashboard');

  return (
    <>
      <StaffTopBar
        title={t('title', { name: firstName })}
        subtitle={t('notBuilt.subtitle')}
      />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-6 py-6">
        {/*
          LayoutDashboard, the same icon the sidebar uses for this route — so
          the empty state names the screen that is missing. NOT the feather:
          components/ui/EmptyState.tsx explains why the mark may never stand in
          for "nothing here".
        */}
        <EmptyState
          icon={LayoutDashboard}
          title={t('notBuilt.title')}
          body={t('notBuilt.body')}
        />
      </main>
    </>
  );
}

export default DashboardNotBuilt;
