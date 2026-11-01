import { BadgeCheck } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { staffRouteAllows } from '@/components/chrome/nav-items';
import type { Locale } from '@/lib/i18n/routing';
import { APPROVAL_QUEUE_FILTERS, mockApi, type ApprovalQueueFilter } from '@/lib/mock-api';
import type { ApprovalKind } from '@/fixtures/practice';
import { useTranslations } from 'next-intl';
import { RouteNotPermitted } from '../RouteNotPermitted';
import { ApprovalsWorkspace } from './ApprovalsWorkspace';

/**
 * Approvals — BUILD_PLAN.md §3, Batch 5, and the most-linked 404 in the
 * product until now.
 *
 * ===========================================================================
 * THE SCREEN SIX SURFACES ALREADY POINTED AT
 * ===========================================================================
 * `demoApprovals` has been read by four rank dashboards, both engagement
 * details and the Billing quotes tab since Batch 4. None of them invented a
 * row; all of them linked here; and the Partner Dashboard's Review button has
 * been resolving to a deliberate 404 since `4e8d0c5`. This is the same
 * collection, read whole.
 *
 * ===========================================================================
 * A DEFECT THE SCREEN EXPOSED BEFORE IT RENDERED ANYTHING
 * ===========================================================================
 * The nav gated this route to `['partner']`. fixtures/practice.ts routes three
 * approvals at a SENIOR ASSOCIATE — under a comment explaining exactly why —
 * and SeniorAssociateDashboard.tsx has shown them an approvals card all along.
 * So a senior associate was being told on their own dashboard that two
 * decisions were waiting, and then refused the screen that holds them. The
 * allow-list is corrected in components/chrome/nav-items.ts; the gate below
 * reads that same list, so the two cannot drift again.
 *
 * ===========================================================================
 * NO DECISION BUTTONS, AND THE SCREEN SAYS SO
 * ===========================================================================
 * The export's Approve button turns green after 900ms, its Reject opens a
 * `prompt()` and an `alert("Decision recorded")`, and its Request Changes
 * alerts "Opening inline redline notation panel". Nothing is recorded by any
 * of them. That is the exact failure this project has refused since Batch 3:
 * an invented success state is worse than no control, because the reader walks
 * away believing a partner signed something.
 *
 * Writes are Batch 6. Until then the queue is a queue — it tells a reviewer
 * what is waiting, how late it is, and who is owed an answer — and it says in
 * one line that deciding is not wired yet, rather than showing three buttons
 * that lie or three greyed-out ones that imply a permission problem.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE AI AUDIT PANEL: "SynQanun Cognitive Engine Audit", "99.4% compliance
 *    confidence", "No unauthorized waiver of director liability detected", and
 *    precedent `[2023] ADGMCFI 0019` "observed & satisfied". Seventh screen
 *    with invented AI analysis and the fourth with a fabricated citation — and
 *    the worst placement of any of them, because this one sits directly above
 *    a sign-off button and is framed as the reason to press it. The Arabic
 *    version adds "معيار التحقق: ISO-27091" for good measure.
 *
 *  · "GPT-4o LEGAL-KERNEL" and the sidebar's "GPT-4o" badge. This product
 *    names no third-party model anywhere, and BUILD_PLAN §6 puts real LLM
 *    calls in Track A.5.
 *
 *  · THE CLAUSE DIFF — "Section 4.2 · Page 14 of 42", "+12 words inserted / -4
 *    words repealed", an inserted-and-struck redline, and "تعديل رقم #7 •
 *    مقارنة بالنسخة v3.8". There is no document body, no version and no
 *    revision history in this product. The two locales also show COMPLETELY
 *    DIFFERENT clause text for the same "v4.2" document: the English carves
 *    out statutory fraud, the Arabic obliges the counterparty to withdraw
 *    arbitration notices within three working days.
 *
 *  · THE SLA STRIP — "Avg Sign-off Time 42m 10s", "Breach SLA Risk 0
 *    Pending", "Action Window: 23h 12m remaining", "Urgent · 24h SLA". There
 *    is no service-level model and no decision clock. What the fixtures record
 *    is a due date, and overdue is counted from it.
 *
 *  · THE COUNTS — "Approved 18 / Rejected 2 / All 23" over three visible rows.
 *    There is also no rejected state in this product: an approval is pending,
 *    has changes asked for, or is approved. "Rejected" and "changes requested"
 *    are different outcomes and collapsing them loses the one that expects the
 *    submitter to come back.
 *
 *  · THE SECURITY THEATRE: "Restricted Operational Enclave", "Enclave Level 3
 *    · Mandatory Partner Execution", "Authentication Token: #ADGM-SEC-8902",
 *    "Deterministic Ledger ID #449-ADGM", "Cryptographically sealed upon
 *    partner confirmation", "تشفير كتل المعاملة #TX-99021", and an engine
 *    status of "Active • 42ms". Nothing here is sealed, ledgered or timed.
 *
 *  · THE ATTACHMENTS — "Settlement_Agreement_v4.2.docx (4.8 MB)" and
 *    "SynQanun_AI_Exposure_Report_MAT-2201.pdf (1.1 MB)". No approval in this
 *    product carries a document, and the second file is a report from the AI
 *    engine that does not exist.
 *
 *  · "Escrow Holdback $28.5M" and "حساب ضمان الأتعاب" — thirteenth instance of
 *    client money. "Open in Document Canvas", a Batch 5 screen not yet built.
 *    Standard Chartered Bank and Abu Dhabi Islamic Bank as parties. "Karim
 *    Al-Khatib · Financial Modeling Analyst", a sixth rank, for the third
 *    export running. `{{CLIENT_LOGO}}` rendered literally, for the fifth.
 *
 *  · TIMESTAMPS IN GST. The firm is in Cairo (fixtures/firm.ts, Africa/Cairo,
 *    GMT+3); every time on this export is labelled GST, which is UTC+4.
 *    Approvals here carry dates, not clock times, because that is what the
 *    fixtures hold.
 *
 *  · THE ARABIC EXTRAS the English half does not have: "الحد الائتماني:
 *    450,000 USD" and "بانتظار التفويض المالي" on the fee-quote card, and a
 *    different delegation reading — English says Fatima submitted it and Tariq
 *    delegated, Arabic says Tariq submitted it and delegated to Fatima.
 */

export const dynamic = 'force-dynamic';

function isState(value: string | undefined): value is ApprovalQueueFilter {
  return value !== undefined && (APPROVAL_QUEUE_FILTERS as string[]).includes(value);
}

const KINDS: ApprovalKind[] = ['document', 'filing', 'quote'];

function isKind(value: string | undefined): value is ApprovalKind {
  return value !== undefined && (KINDS as string[]).includes(value);
}

export default async function StaffApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ state?: string; kind?: string; item?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  /*
   * THE GATE RUNS BEFORE THE QUERY, so no approval enters the payload for a
   * rank that may not read one. An approval names a client's settlement terms
   * and a firm's fee; hiding the screen while shipping its rows to the browser
   * is the defect /staff had, and the allow-list is the nav's own.
   */
  if (!staffRouteAllows(me.rank, 'approvals')) {
    return <ApprovalsNotPermitted rank={me.rank} />;
  }

  // An unrecognised value falls back rather than erroring — a view preference
  // arriving from an edited or stale link.
  const state: ApprovalQueueFilter = isState(query.state) ? query.state : 'pending';
  const kind = isKind(query.kind) ? query.kind : undefined;

  const queue = await mockApi.staff.approvalQueue(me.id, {
    state,
    kind,
    id: query.item,
  });

  return (
    <ApprovalsWorkspace
      locale={locale as Locale}
      queue={queue}
      state={state}
      kind={kind}
      itemInUrl={Boolean(query.item)}
    />
  );
}

function ApprovalsNotPermitted({ rank }: { rank: string }) {
  const t = useTranslations('staffApprovals');
  const tRank = useTranslations('ranks');

  return (
    <RouteNotPermitted
      icon={BadgeCheck}
      pageTitle={t('title')}
      subtitle={t('notPermitted.subtitle')}
      title={t('notPermitted.title')}
      // The BARE category, not `holder` — it lands inside a sentence. See
      // lib/ranks.ts.
      body={t('notPermitted.body', { rank: tRank(rank) })}
    />
  );
}
