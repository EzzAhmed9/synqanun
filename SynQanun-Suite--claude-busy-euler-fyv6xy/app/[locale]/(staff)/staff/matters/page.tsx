import { getTranslations, setRequestLocale } from 'next-intl/server';
import { tenantToday } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import { toMatterWorkType } from '@/lib/matter-work-types';
import { mockApi } from '@/lib/mock-api';
import { FolderPlus, Scale } from 'lucide-react';
import { Button } from '@/components/ui';
import { Link } from '@/lib/i18n/navigation';
import { RegisterView, toRegisterFilter } from '../register/RegisterView';
import { canReassignLead } from '../register/permissions';
import { canOpenMatter, canReopenMatter } from './permissions';

/**
 * Matters — BUILD_PLAN.md §3, Batch 4. The firm's docket register.
 *
 * ===========================================================================
 * THE SCREEN THE CLIENT-SCOPING FIX WAS FOR
 * ===========================================================================
 * Every row names its client. That was not possible a commit ago: a matter
 * pointed at the one portal ACCOUNT, so a firm-wide register would have had
 * nine rows all reading "Gulf Holdings" — a column with one value in it. The
 * client column, the client filter and the count behind that filter all exist
 * because an engagement now names its client independently of who can sign in.
 *
 * The screen itself is shared with the projects register — see
 * ../register/RegisterView.tsx. This file reads the collection, names the
 * words, and keeps the record of what its own export claimed.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REGISTER KNOWS, AND WHERE EACH FIGURE COMES FROM
 * ---------------------------------------------------------------------------
 * Reference, caption, practice area, forum, status and court file number are
 * the matter's own (fixtures/matters.ts) — the status line is the SAME words
 * the client is shown on their portal, not a second summary written for the
 * firm. The client comes from `clientId`. The team is the lead spliced onto
 * `demoSupportAssignments`, so the register and a fee earner's own dashboard
 * cannot disagree about who is on a file. The next date is DERIVED from the
 * procedural timeline — the same derivation the client's key-date strip uses,
 * so the register and the matter's own screen name the same next hearing.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE ENTIRE KPI RIBBON, four cards and twelve figures: "Active Matters
 *    114 / Total Registered: 142 / 80.2% Live Capacity", "Unbilled WIP (30D)
 *    $2.48M / 94.8% Realized / Pending Approval: $412,000 / Avg $21.7k per
 *    Matter", "Court Hearings < 14D 12 / DIFC: 6 · ADGM: 4 · Federal: 2 / 4
 *    Pleadings Due", "Critical Risk Injunctions 3 / 24h Deadline". The firm's
 *    book is nine matters. Every one of those numbers describes a register
 *    that does not exist, and the header of this screen says nine because nine
 *    is what fixtures/matters.ts holds.
 *
 *  · THE WIP / UNBILLED COLUMN — "$184,250 · 42.5 hrs" on every row. There is
 *    no time ledger in this product. The billable timer in the corner of this
 *    very page discards its seconds when you stop it (StaffChrome.tsx says so
 *    in as many words), so a per-matter unbilled total would be a column of
 *    numbers with nothing behind any of them. Batch 5 owns Billing.
 *
 *  · THE PRIORITY BADGES — "PRIORITY HIGH", "URGENT INJUNCTION", "MULTI-FORUM",
 *    "$750M FACILITY", and a segment tab counting 7 of them. No matter in this
 *    product has a priority. What it has is `needsAttention`, which means
 *    something is waiting on the CLIENT, and that is what the badge and the
 *    segment say.
 *
 *  · THE TWO LOCALES DISAGREEING WITH EACH OTHER. The English export bills
 *    MAT-2904 at $495,600 and the Arabic at 490,000 AED; MAT-1988 at $92,400
 *    and 125,000; MAT-2045 at $278,900 and 510,000. The Arabic export also
 *    renames four of the six matters outright. Same six rows, two different
 *    registers.
 *
 *  · REAL PARTIES AND A REAL FIRM. The export makes the tenant "Al-Tamimi &
 *    Partners" (a real firm), the counterparties ADNOC Distribution, Abu Dhabi
 *    Islamic Bank and Standard Chartered Bank, opposing counsel Clifford
 *    Chance LLP, and — on the detail screen — puts Sir Peter Gross on the
 *    bench. He is a real English judge, as was the Justice Sir Jeremy Cooke the
 *    Approvals export named twice.
 *
 *  · "AI Portfolio Risk Audit", "Export (CSV/XLS)", "+ New Matter", the row
 *    checkboxes and their select-all, and the kebab menu on every row. Three
 *    writes, one extraction, and a bulk-action affordance with no bulk action
 *    behind it. Batch 6.
 *
 *  · THE STATUS DROPDOWN, which duplicates the segment tabs beside it with a
 *    different vocabulary ("Trial Prep / In Court (34)", "Pleadings Stage
 *    (29)"), and the sort control, which offers to reorder a nine-row list by
 *    a field nothing else in this product sorts on. The order is stated
 *    instead, in the caption.
 *
 *  · PAGINATION READING "Showing 1–6 of 142" over six rows, with page numbers
 *    up to 6. `paged()` exists in lib/mock-api.ts and is used by the client's
 *    own list; it is not used here because nine rows is one page and inventing
 *    a second would be the same lie in a smaller font.
 *
 *  · "Litigation & Arbitration Practice" as a department switcher, "FY: 2025"
 *    as an active filter, "View: Dense Register", the kanban toggle, and the
 *    Arabic-only "إملاء قضائي" (judicial dictation) button in the top bar.
 *    None has anything behind it and the last exists in only one language.
 */

/** Rendered per request — every date resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

export default async function StaffMattersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    view?: string;
    segment?: string;
    type?: string;
    client?: string;
    venue?: string;
    lead?: string;
  }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const filter = toRegisterFilter(query.segment);
  // The Archive holds closed matters; anything else in `?view=` is the active list.
  const view = query.view === 'archive' ? 'archive' : 'active';
  // An unrecognised `?type=` is ignored rather than narrowing to nothing.
  const workType = toMatterWorkType(query.type);
  const me = await mockApi.staff.currentStaff();

  /*
    Fetched only for a rank that may reassign. The options are a list of who
    runs this firm's files, and a rank that cannot use them does not need them
    in the payload — the same rule every gated read in this codebase follows.
    The Server Action checks again.
  */
  const leadOptions = canReassignLead(me.rank) ? await mockApi.staff.leadOptions() : null;
  const tBulk = await getTranslations('registerBulk');
  const result = await mockApi.staff.matters(me.id, {
    view,
    filter,
    clientId: query.client,
    venue: query.venue,
    leadId: query.lead,
    workType,
  });

  const t = await getTranslations('staffMatters.new');

  return (
    <RegisterView
      locale={locale as Locale}
      namespace="staffMatters"
      basePath="/staff/matters"
      // The same icon the nav gives this register, from the same idea of
      // what it is: components/chrome/nav-items.ts.
      icon={Scale}
      filter={filter}
      result={result}
      selected={{
        view: view === 'archive' ? 'archive' : undefined,
        type: workType,
        client: query.client,
        venue: query.venue,
        lead: query.lead,
      }}
      // Drawn only for a rank that may use it; the Server Action checks again.
      canReopen={canReopenMatter(me.rank)}
      // Flattened here, because this is where the locale is.
      bulk={{
        csvHeadings: [
          tBulk('csv.reference'),
          tBulk('csv.title'),
          tBulk('csv.type'),
          tBulk('csv.client'),
          tBulk('csv.venue'),
          tBulk('csv.status'),
          tBulk('csv.lead'),
          tBulk('csv.updated'),
          tBulk('csv.next'),
        ],
        fileStem: 'matters',
        today: tenantToday(),
        leadOptions: leadOptions?.map((row) => ({
          value: row.value,
          label: row.label[locale as Locale],
        })) ?? null,
      }}
      // Absent, never disabled, for a rank that may not open a file. The route
      // and the Server Action both check independently — see ./permissions.ts.
      action={
        canOpenMatter(me.rank) ? (
          <Link href="/staff/matters/new">
            <Button variant="primary" size="md" icon={<FolderPlus aria-hidden size={15} />}>
              {t('action')}
            </Button>
          </Link>
        ) : undefined
      }
    />
  );
}
