import { Clock, FilePlus, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { staffRouteAllows } from '@/components/chrome/nav-items';
import {
  Badge,
  buttonClasses,
  Card,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  tabTriggerClasses,
} from '@/components/ui';
import { formatCalendarDate, formatMoney, formatRelativeDays } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import {
  INVOICE_FILTERS,
  RECENTLY_ISSUED_DAYS,
  mockApi,
  type BillingLedger,
  type InvoiceDraftRecord,
  type InvoiceFilter,
  type QuoteList,
} from '@/lib/mock-api';
import type { ApprovalState } from '@/fixtures/practice';
import { INVOICE_STATUS_TONE } from '@/lib/status-tones';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../StaffChrome';
import { CardHead } from '../cards';
import { RouteNotPermitted } from '../RouteNotPermitted';

/**
 * Billing & Quotes — BUILD_PLAN.md §3, Batch 4, the last item.
 *
 * ===========================================================================
 * THIS IS WHERE FIVE SCREENS' WORTH OF DEFERRALS COME DUE
 * ===========================================================================
 * The matters register, the projects register, both engagement details, the
 * CRM and the client detail all refused a WIP column with the same sentence:
 * there is no time ledger, and Batch 5 owns Billing. Batch 5 is here, and the
 * answer has not changed — building the screen is what makes it concrete.
 *
 * WHAT THE PRODUCT HOLDS: fee statements it has issued (fixtures/invoices.ts)
 * and fee quotes waiting on a decision (fixtures/practice.ts). Both are real
 * records with real figures, and every number on this screen is one of them or
 * a sum of them.
 *
 * WHAT IT DOES NOT HOLD: a single time entry. No date-matter-description-
 * hours-rate row exists anywhere, and no fee earner has an hourly rate. So
 * there is no work in progress, no realization rate, no billable value, and no
 * rate card — and the screen says that in as many words rather than leaving a
 * reader to infer it from two tabs that are quietly missing.
 *
 * ===========================================================================
 * NO CLIENT COMPONENT
 * ===========================================================================
 * The registers need one for their search box: a half-typed string is not a
 * view and does not belong in the URL. This screen has no search, because
 * eight statements and four quotes are a list you read rather than one you
 * query — so every narrowing here IS a view, every filter is a real link, and
 * the whole thing renders on the server.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE TIME SHEET, which is the export's main event: five rows of date, fee
 *    earner, matter, UTBMS activity code, hours, rate and line total, with a
 *    summary bar reading "Total Hours: 23.0 hrs · Billable Value: $11,475.00".
 *    Not one of those columns exists. UTBMS is a real and correct standard for
 *    a firm that bills institutional clients, and adopting it is a good idea —
 *    for a batch that adds a time ledger to adopt it INTO.
 *
 *  · THE KPI STRIP'S TWO UNBACKED CARDS: "Realization & Collection Rate 93.4%
 *    / Target: 90.0% / Top Quartile Tier" and "Unbilled WIP $426,850 / 284.5
 *    logged unbilled hours / 91% billable yield". A realization rate is billed
 *    fees over recorded fees, and this product records neither. The two cards
 *    that ARE backed — outstanding and overdue — are on this screen, computed
 *    from statements a reader can go and count.
 *
 *  · "Total Billed This Month $842,500 / +14.2% vs target / 46 settled
 *    invoices", over a ledger of eight. There is no target, no monthly cycle
 *    and no forty-six invoices. This screen reports what was issued in the
 *    last thirty days and says "thirty days" rather than implying a cycle.
 *
 *  · THE RATE CARD — five ranks priced at $1,200 / $950 / $680 / $450 / $220
 *    an hour, in three columns (ADGM/DIFC, Onshore UAE, Blended Avg), "Last
 *    updated by Managing Board: Jan 15, 2025", and "Partner-editable only".
 *    No rate exists in this product. The Arabic export prices the same five
 *    ranks differently and names a sixth, "محلل نمذجة مالية" — a financial
 *    modelling analyst, which is not one of the five ranks in lib/ranks.ts and
 *    who also appears in the English time sheet as a fee earner.
 *
 *  · THE CURRENCY TOGGLE. "USD $ / AED د.إ" with every figure pre-converted —
 *    $842,500 shown as 3,094,000 AED, $318,400 as 1,169,150 AED. Those are two
 *    different rates (3.672 and 3.672…, then 3.6725), neither of them chosen by
 *    anyone, and a firm's ledger does not get to invent an exchange rate. The
 *    ledger here is one currency and `firmLedger` throws if it is ever not.
 *
 *  · "AI Realization & Leakage Audit" / "تدقيق نسب التحصيل وتسرب الأتعاب
 *    بالذكاء الاصطناعي". Sixth screen with invented AI analysis, and the first
 *    where it would be auditing figures that do not exist.
 *
 *  · "Retainer Escrow Cleared" on a quote, and "رصيد الأمانة" elsewhere in the
 *    set. Twelfth instance of client money across these exports, on the one
 *    screen where a firm would actually look for it.
 *
 *  · EVERY WRITE: "New Fee Quote", "Add Manual Entry", "Export Financials
 *    (CSV/XLS)", "Edit Rate Benchmarks", "Launch Quote Line-Item Builder",
 *    "إدارة جداول الرسوم المخصصة للعملاء", and the kebab on every row. Batch 6.
 *
 *  · The tenant as "Al-Tamimi & Partners" in English and "رم وشركاه" in
 *    Arabic — the same split the projects export shipped — plus "Etihad Rail",
 *    "Mashreq Bank" and "Abu Dhabi Islamic Bank" as clients, and "ADGM" as a
 *    status chip in the sidebar of a Cairo firm.
 */

export const dynamic = 'force-dynamic';

const QUOTE_STATES: ApprovalState[] = ['pending', 'changesRequested', 'approved'];

function isInvoiceFilter(value: string | undefined): value is InvoiceFilter {
  return value !== undefined && (INVOICE_FILTERS as string[]).includes(value);
}

function isQuoteState(value: string | undefined): value is ApprovalState {
  return value !== undefined && (QUOTE_STATES as string[]).includes(value);
}

export default async function StaffBillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ view?: string; status?: string; state?: string; client?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const me = await mockApi.staff.currentStaff();

  /*
   * THE GATE RUNS BEFORE THE QUERIES, so the firm's ledger never enters the
   * payload for a rank that may not read it. Hiding a screen while shipping
   * its data to the browser is the defect the /staff dashboard had, and the
   * allow-list is the nav's own — see `staffRouteAllows`.
   */
  if (!staffRouteAllows(me.rank, 'billing')) {
    return <BillingNotPermitted rank={me.rank} />;
  }

  const view = query.view === 'quotes' ? 'quotes' : 'invoices';
  const status: InvoiceFilter = isInvoiceFilter(query.status) ? query.status : 'all';
  const state = isQuoteState(query.state) ? query.state : undefined;

  const [ledger, quotes, drafts] = await Promise.all([
    mockApi.staff.invoices({ filter: status, clientId: query.client }),
    mockApi.staff.quotes({ state }),
    // Session-scoped and NOT part of the ledger — they are not statements. See
    // the drafts section below, and fixtures/invoices.ts on why they are a
    // separate collection rather than a status.
    mockApi.staff.invoiceDrafts(),
  ]);

  return (
    <Billing
      locale={locale as Locale}
      view={view}
      status={status}
      state={state}
      client={query.client}
      ledger={ledger}
      quotes={quotes}
      drafts={drafts}
    />
  );
}

function Billing({
  locale,
  view,
  status,
  state,
  client,
  ledger,
  quotes,
  drafts,
}: {
  locale: Locale;
  view: 'invoices' | 'quotes';
  status: InvoiceFilter;
  state?: ApprovalState;
  client?: string;
  ledger: BillingLedger;
  quotes: QuoteList;
  drafts: InvoiceDraftRecord[];
}) {
  const t = useTranslations('billing');
  const tInvoiceStatus = useTranslations('invoices.status');
  const tRank = useTranslations('ranks');

  const money = (amount: number, currency: string) => formatMoney(amount, currency, locale);

  const summary = [
    {
      key: 'outstanding',
      value: money(ledger.totals.outstanding, ledger.currency),
      caption: t('summary.outstandingCount', {
        count: ledger.counts.overdue + ledger.counts.due,
      }),
    },
    {
      key: 'overdue',
      value: money(ledger.totals.overdue, ledger.currency),
      caption: t('summary.overdueCount', { count: ledger.counts.overdue }),
      alarm: ledger.counts.overdue > 0,
    },
    {
      key: 'issued',
      value: money(ledger.totals.issuedRecently, ledger.currency),
      caption: t('summary.issuedCaption', { days: RECENTLY_ISSUED_DAYS }),
    },
    {
      key: 'quotes',
      value: money(quotes.pendingValue, quotes.currency),
      caption: t('summary.quotesCount', { count: quotes.counts.pending }),
    },
  ];

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <div className="flex justify-end">
          {/*
            The only write on this screen. Secondary rather than the page's one
            red action, because the ledger below is what somebody came here to
            read — design.md §4.
          */}
          <Link
            href="/staff/billing/new"
            className={buttonClasses({ variant: 'secondary', size: 'sm' })}
          >
            <FilePlus aria-hidden size={15} className="me-1.5" />
            {t('drafts.new')}
          </Link>
        </div>

        {/* Four sums, each the total of rows on this page ---------------- */}
        <section className="grid grid-cols-1 gap-4 tablet:grid-cols-2 desktop:grid-cols-4">
          {summary.map((card) => (
            <Card key={card.key} padding="lg">
              <p className="text-caption text-gray-500">{t(`summary.${card.key}`)}</p>
              <p
                className={cn(
                  'mt-1 font-mono text-title [unicode-bidi:isolate]',
                  card.alarm ? 'text-action' : 'text-gray-700'
                )}
              >
                {card.value}
              </p>
              <p className="mt-1 text-caption text-gray-500">{card.caption}</p>
            </Card>
          ))}
        </section>

        {/*
          Drafts, ABOVE the ledger tabs and outside them.

          Not a third tab and not a fourth filter on the invoices view, because
          a draft is not a statement: nothing has been issued, nobody owes
          anything, and none of the four sums above counts it. Putting it inside
          the ledger would make "outstanding" a figure a reader has to check the
          filter to interpret.

          It renders only when there is something in it. An empty "drafts"
          panel on every load would advertise a feature rather than report a
          state.
        */}
        {drafts.length > 0 ? (
          <Card padding="none" className="overflow-hidden">
            <header className="border-b border-gray-200 p-5">
              <h2 className="font-sans text-title text-gray-900">{t('drafts.heading')}</h2>
              <p className="mt-0.5 text-caption text-gray-500">{t('drafts.caption')}</p>
            </header>
            <ul className="divide-y divide-gray-200">
              {drafts.map((draft) => (
                <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-gray-700">
                      <bdi>{draft.description}</bdi>
                    </span>
                    <span className="mt-0.5 block text-caption text-gray-500 [unicode-bidi:isolate]">
                      <span dir="ltr" className="font-mono text-reference text-gray-500">
                        {draft.engagementRef}
                      </span>
                      {' · '}
                      <bdi>{draft.clientName[locale]}</bdi>
                      {' · '}
                      {t('drafts.lines', { count: draft.lines.length })}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-body tabular-nums text-gray-900 [unicode-bidi:isolate]">
                      {money(Number(draft.total ?? (draft as any).totalAmount ?? 0), draft.currency)}
                    </span>
                    {/* §5.1: a session-scoped record says so on screen. */}
                    <Badge tone="neutral" icon={null}>
                      {t('drafts.notIssued')}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {/* Two views, both backed. The export's other two are below. ----- */}
        <nav aria-label={t('views.label')} className="flex gap-1 border-b border-gray-200">
          {(['invoices', 'quotes'] as const).map((value) => (
            <Link
              key={value}
              href={{
                pathname: '/staff/billing',
                query: value === 'invoices' ? {} : { view: value },
              }}
              aria-current={value === view ? 'page' : undefined}
              className={cn(tabTriggerClasses(value === view), 'whitespace-nowrap')}
            >
              {t(`views.${value}`)}
              <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                {value === 'invoices' ? ledger.counts.all : quotes.counts.all}
              </span>
            </Link>
          ))}
        </nav>

        {view === 'invoices' ? (
          <Invoices
            locale={locale}
            ledger={ledger}
            status={status}
            client={client}
            t={t}
            tInvoiceStatus={tInvoiceStatus}
          />
        ) : (
          <Quotes locale={locale} quotes={quotes} state={state} t={t} tRank={tRank} />
        )}

        <TimeLedgerMissing />
      </main>
    </>
  );
}

/* ===========================================================================
 * The ledger
 * ======================================================================== */

function Invoices({
  locale,
  ledger,
  status,
  client,
  t,
  tInvoiceStatus,
}: {
  locale: Locale;
  ledger: BillingLedger;
  status: InvoiceFilter;
  client?: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  tInvoiceStatus: (key: string) => string;
}) {
  const columns = {
    reference: t('columns.reference'),
    client: t('columns.client'),
    engagement: t('columns.engagement'),
    issued: t('columns.issued'),
    due: t('columns.due'),
    amount: t('columns.amount'),
    status: t('columns.status'),
  };

  /** Keeps the other filter while changing this one. */
  const href = (next: { status?: InvoiceFilter; client?: string }) => ({
    pathname: '/staff/billing' as const,
    query: {
      ...(next.status && next.status !== 'all' ? { status: next.status } : {}),
      ...(next.client ? { client: next.client } : {}),
    },
  });

  return (
    <>
      {/* Both strips absent on an empty collection: every tab would read zero
          and lead back to the same screen. Same call as the registers, the CRM,
          the approvals queue and the inbox. */}
      {ledger.counts.all === 0 ? null : (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1">
          {INVOICE_FILTERS.map((value) => (
            <Link
              key={value}
              href={href({ status: value, client })}
              aria-current={value === status ? 'page' : undefined}
              className={cn(tabTriggerClasses(value === status), 'whitespace-nowrap')}
            >
              {t(`filters.${value}`)}
              <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                {ledger.counts[value]}
              </span>
            </Link>
          ))}
        </div>

        {/* Whose statements. Derived from the ledger, so no option is empty. */}
        <div className="flex flex-wrap gap-1">
          <Link
            href={href({ status })}
            aria-current={client === undefined ? 'page' : undefined}
            className={cn(tabTriggerClasses(client === undefined), 'whitespace-nowrap')}
          >
            {t('filters.everyClient')}
          </Link>
          {ledger.clients.map((facet) => (
            <Link
              key={facet.value}
              href={href({ status, client: facet.value })}
              aria-current={client === facet.value ? 'page' : undefined}
              className={cn(tabTriggerClasses(client === facet.value), 'whitespace-nowrap')}
            >
              <bdi>{facet.label[locale]}</bdi>
              <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
                {facet.count}
              </span>
            </Link>
          ))}
        </div>
      </div>
      )}

      {/*
        A LEDGER WITH NOTHING IN IT IS NOT A FILTER THAT MATCHED NOTHING.
        `counts.all` is the whole ledger, before the status tabs and before the
        client tabs, so zero there means the firm has never issued a statement.
        Both cases used to say "Nothing in the ledger matches this view", which
        reads as though the reader had narrowed their way there — on a screen
        where they had not selected anything at all.
      */}
      {ledger.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={ledger.counts.all === 0 ? t('empty.noInvoices') : t('empty.invoices')}
          body={ledger.counts.all === 0 ? t('empty.noInvoicesBody') : t('empty.invoicesBody')}
          className="border-dashed"
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-gray-200 bg-white">
          <Table striped className="tablet:min-w-[52rem]">
            <TableHead>
              <TableRow>
                <TableHeaderCell>{columns.reference}</TableHeaderCell>
                <TableHeaderCell>{columns.client}</TableHeaderCell>
                <TableHeaderCell>{columns.engagement}</TableHeaderCell>
                <TableHeaderCell>{columns.issued}</TableHeaderCell>
                <TableHeaderCell>{columns.due}</TableHeaderCell>
                <TableHeaderCell numeric>{columns.amount}</TableHeaderCell>
                <TableHeaderCell>{columns.status}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ledger.items.map((invoice) => (
                <TableRow key={invoice.id} className="h-auto align-top">
                  <TableCell className="py-3">
                    {/* Latin in every locale — lib/format.ts. */}
                    <span dir="ltr" className="block font-mono text-reference text-legal-navy">
                      {invoice.reference}
                    </span>
                    <span className="mt-0.5 block text-caption text-gray-500">
                      <bdi>{invoice.description[locale]}</bdi>
                    </span>
                  </TableCell>
                  <TableCell label={columns.client} className="py-3">
                    <Link
                      href={`/staff/clients/${invoice.clientId}`}
                      className="text-gray-700 hover:underline"
                    >
                      <bdi>{invoice.clientName[locale]}</bdi>
                    </Link>
                  </TableCell>
                  <TableCell label={columns.engagement} className="py-3">
                    <Link
                      href={`/staff/matters/${invoice.engagementRef}`}
                      className="hover:underline"
                    >
                      <span dir="ltr" className="font-mono text-reference text-gray-700">
                        {invoice.engagementRef}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell label={columns.issued} className="py-3 [unicode-bidi:isolate]">
                    {formatCalendarDate(invoice.issuedOn, locale, { month: 'short' })}
                  </TableCell>
                  <TableCell label={columns.due} className="py-3 [unicode-bidi:isolate]">
                    {/* A settled statement reports when it was PAID, never its
                        due date — two different facts, and fixtures/invoices.ts
                        records the confusion that made `paidDaysAgo` its own
                        field. */}
                    {invoice.paidOn
                      ? t('paidOn', {
                          date: formatRelativeDays(invoice.paidOn, locale),
                        })
                      : formatCalendarDate(invoice.dueOn, locale, { month: 'short' })}
                  </TableCell>
                  <TableCell numeric label={columns.amount} className="py-3">
                    <span className="[unicode-bidi:isolate]">
                      {formatMoney(invoice.amount, invoice.currency, locale)}
                    </span>
                  </TableCell>
                  <TableCell label={columns.status} className="py-3">
                    <Badge tone={INVOICE_STATUS_TONE[invoice.status]} icon={null}>
                      {tInvoiceStatus(invoice.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* A shown-of-total counter over a collection with no total is noise:
          an empty ledger read "No statements of 0" under an empty state that had
          already said so. */}
      {ledger.counts.all === 0 ? null : (
      <p className="text-caption text-gray-500">
        {t('ledgerFooter', { shown: ledger.items.length, total: ledger.counts.all })}
      </p>
      )}
    </>
  );
}

/* ===========================================================================
 * Quotes
 * ======================================================================== */

function Quotes({
  locale,
  quotes,
  state,
  t,
  tRank,
}: {
  locale: Locale;
  quotes: QuoteList;
  state?: ApprovalState;
  t: (key: string, values?: Record<string, string | number>) => string;
  tRank: (key: string) => string;
}) {
  const columns = {
    quote: t('columns.quote'),
    client: t('columns.client'),
    amount: t('columns.amount'),
    pricedBy: t('columns.pricedBy'),
    decidedBy: t('columns.decidedBy'),
    due: t('columns.due'),
    state: t('columns.state'),
  };

  return (
    <>
      {quotes.counts.all === 0 ? null : (
      <div className="flex flex-wrap gap-1">
        {(['all', ...QUOTE_STATES] as const).map((value) => (
          <Link
            key={value}
            href={{
              pathname: '/staff/billing',
              query: value === 'all' ? { view: 'quotes' } : { view: 'quotes', state: value },
            }}
            aria-current={(state ?? 'all') === value ? 'page' : undefined}
            className={cn(tabTriggerClasses((state ?? 'all') === value), 'whitespace-nowrap')}
          >
            {t(`quoteStates.${value}`)}
            <span className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]">
              {quotes.counts[value]}
            </span>
          </Link>
        ))}
      </div>
      )}

      {/* Same split as the ledger above, for the same reason. */}
      {quotes.items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={quotes.counts.all === 0 ? t('empty.noQuotes') : t('empty.quotes')}
          body={quotes.counts.all === 0 ? t('empty.noQuotesBody') : t('empty.quotesBody')}
          className="border-dashed"
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-gray-200 bg-white">
          <Table striped className="tablet:min-w-[52rem]">
            <TableHead>
              <TableRow>
                <TableHeaderCell>{columns.quote}</TableHeaderCell>
                <TableHeaderCell>{columns.client}</TableHeaderCell>
                <TableHeaderCell numeric>{columns.amount}</TableHeaderCell>
                <TableHeaderCell>{columns.pricedBy}</TableHeaderCell>
                <TableHeaderCell>{columns.decidedBy}</TableHeaderCell>
                <TableHeaderCell>{columns.due}</TableHeaderCell>
                <TableHeaderCell>{columns.state}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotes.items.map((quote) => (
                <TableRow key={quote.id} className="h-auto align-top">
                  <TableCell className="py-3">
                    <span className="block text-body-emphasis text-gray-700">
                      <bdi>{quote.title[locale]}</bdi>
                    </span>
                  </TableCell>
                  <TableCell label={columns.client} className="py-3">
                    <Link
                      href={`/staff/clients/${quote.clientId}`}
                      className="text-gray-700 hover:underline"
                    >
                      <bdi>{quote.clientName[locale]}</bdi>
                    </Link>
                  </TableCell>
                  <TableCell numeric label={columns.amount} className="py-3">
                    <span className="[unicode-bidi:isolate]">
                      {formatMoney(quote.amount, quote.currency, locale)}
                    </span>
                  </TableCell>
                  <TableCell label={columns.pricedBy} className="py-3">
                    <span className="block text-gray-700">
                      <bdi>{quote.submittedBy[locale]}</bdi>
                    </span>
                    <span className="mt-0.5 block text-caption text-gray-500">
                      {tRank(`holder.${quote.submittedByRank}`)}
                    </span>
                  </TableCell>
                  <TableCell label={columns.decidedBy} className="py-3">
                    <bdi>{quote.assignedTo[locale]}</bdi>
                  </TableCell>
                  <TableCell label={columns.due} className="py-3 [unicode-bidi:isolate]">
                    {formatCalendarDate(quote.dueOn, locale, { month: 'short' })}
                  </TableCell>
                  <TableCell label={columns.state} className="py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        tone={
                          quote.state === 'approved'
                            ? 'success'
                            : quote.state === 'changesRequested'
                              ? 'neutral'
                              : 'info'
                        }
                        icon={null}
                      >
                        {t(`quoteStates.${quote.state}`)}
                      </Badge>
                      {/* Only a pending quote can be late — see `daysOverdue`. */}
                      {quote.daysOverdue > 0 ? (
                        <Badge tone="error">{t('overdue', { count: quote.daysOverdue })}</Badge>
                      ) : null}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {quotes.counts.all === 0 ? null : (
      <p className="text-caption text-gray-500">
        {t('quotesFooter', { shown: quotes.items.length, total: quotes.counts.all })}
      </p>
      )}
    </>
  );
}

/* ===========================================================================
 * The half that is not built
 * ======================================================================== */

/**
 * The time ledger, named as missing rather than approximated.
 *
 * ===========================================================================
 * WHY THIS IS ON THE SCREEN AND NOT ONLY IN A COMMENT
 * ===========================================================================
 * Every other refusal in this codebase is recorded in a file header, where the
 * next developer finds it. This one has a second audience: anyone shown the
 * prototype will look at a Billing screen with no hours on it and reasonably
 * wonder whether the feature is missing or merely unfinished. Saying it out
 * loud is the difference between an honest prototype and one that hopes nobody
 * asks.
 *
 * It also names the timer, because the timer is the sharpest version of the
 * problem: every staff screen in this product has a running billable-hours
 * clock in the corner, and stopping it throws the time away
 * (StaffChrome.tsx says so). A Billing screen is exactly where someone would
 * go looking for what that timer recorded.
 */
function TimeLedgerMissing() {
  const t = useTranslations('billing.noLedger');

  return (
    <Card padding="lg" className="border-dashed bg-gray-50">
      <CardHead icon={Clock} heading={t('heading')} caption={t('caption')} />
      <p className="mt-3 text-body text-gray-600">{t('body')}</p>
      <ul className="mt-3 list-disc space-y-1 text-body text-gray-600 ps-5">
        <li>{t('items.entries')}</li>
        <li>{t('items.rates')}</li>
        <li>{t('items.timer')}</li>
      </ul>
      <p className="mt-3 border-t border-gray-200 pt-3 text-caption text-gray-500">
        {t('holds')}
      </p>
    </Card>
  );
}

/**
 * The rank that may not read this.
 *
 * The treatment is shared with the approvals queue — see
 * ../RouteNotPermitted.tsx, which carries the reasoning for why a permission
 * refusal is the right answer here and the wrong one on /staff.
 */
function BillingNotPermitted({ rank }: { rank: string }) {
  const t = useTranslations('billing');
  const tRank = useTranslations('ranks');

  return (
    <RouteNotPermitted
      icon={Receipt}
      pageTitle={t('title')}
      subtitle={t('notPermitted.subtitle')}
      title={t('notPermitted.title')}
      // The BARE category, not `holder`. This rank lands inside a sentence,
      // where "درجة: …" would read as a label dropped into a clause — so the
      // Arabic copy carries the framing itself. See lib/ranks.ts.
      body={t('notPermitted.body', { rank: tRank(rank) })}
    />
  );
}
