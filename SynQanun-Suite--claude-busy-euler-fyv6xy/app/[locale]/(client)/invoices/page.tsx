import {
  CheckCircle2,
  CircleDollarSign,
  Receipt,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, EmptyState } from '@/components/ui';
import { formatCalendarDate, formatMoney } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import {
  INVOICE_FILTERS,
  mockApi,
  type InvoiceFilter,
  type InvoiceRecord,
  type InvoiceSummary,
} from '@/lib/mock-api';
import { ClientTopBar } from '../ClientPortalChrome';
import { EngagementFilterNav } from '../EngagementFilterNav';
import { InvoicesTable, type InvoiceRowData } from './InvoicesTable';

/**
 * Invoices — the client's fee ledger.
 *
 * Reads fixtures/invoices.ts, which already existed: the dashboard card and
 * both engagement detail tabs read the same collection, and this screen is the
 * first to show it whole. Nothing was recreated; what changed is that the
 * invoice TOTAL and STATUS are now derived rather than stored, so a figure on
 * this screen cannot disagree with the same invoice on the dashboard.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE SUMMARY STRIP'S ARITHMETIC. "3 Invoices settled / paid ($40,000.00)"
 *    sits above a table whose three settled rows add up to $50,000. Every
 *    figure in the strip below comes from mockApi.invoices.summary(), computed
 *    in the same pass as the rows.
 *
 *  · THE TWO LANGUAGES DISAGREEING WITH EACH OTHER. For the same five invoice
 *    numbers, the Arabic list and the English list give INV-2025-089 different
 *    issue AND due dates, give INV-2024-118 a different amount ($8,000 vs
 *    $10,000) AND a different engagement (MAT-2201 vs MAT-1875), and the Arabic
 *    version tags INV-2025-014 "[استشارة]" — a third engagement kind that does
 *    not exist. One fixture, read by both.
 *
 *  · THE ESCROW / WIRE CARD and everything in it: an IBAN, a SWIFT code, a
 *    "SynQanun Client Trust Account", a "Verified Escrow" badge and a
 *    "Client Trust Account #ADGM-9921" in the footer. There is no trust account,
 *    no bank and no escrow here, and publishing account details a client might
 *    actually wire money to is the single most dangerous thing on these two
 *    screens to invent.
 *
 *  · THE "UAE FTA Value Added Tax (VAT 5%)" LINE and the TRN
 *    "AE-TRN-10049281000003", on a statement from a firm whose domain, phone
 *    numbers and timezone are Cairo. See the note in fixtures/invoices.ts.
 *
 *  · THE AUDIT TRAIL — "Automated reminder dispatched", "Partner approved for
 *    release", timestamped to the minute. No such log exists.
 *
 *  · "Pay All Outstanding ($30,500.00)" in the top bar and a "Pay Now" button in
 *    every unpaid row. See the note in InvoicesTable.tsx on why the primary
 *    belongs on the detail view, once.
 *
 *  · "Adv. R. Al-Khatib" and "Adv. Fatima Al-Zahra" — the gendered honorific,
 *    and a second name appearing only inside a line-item description.
 *  · THE "Invoiced YTD (2025)" CARD, whose window the fixtures' relative dates
 *    make meaningless, and whose figure the export got wrong anyway.
 *  · THE SIDEBAR'S "5" COUNT BADGE beside Invoices. A badge means something
 *    needs you; the ledger's total does not.
 *  · THE PAGINATION BAR over five rows, the all-caps column headers, the pulsing
 *    dots, "v2.4 LTS" and the green "Online" indicator.
 */

/** Rendered per request — every date here resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

function isInvoiceFilter(value: string | undefined): value is InvoiceFilter {
  return value !== undefined && (INVOICE_FILTERS as string[]).includes(value);
}

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ locale }, { status }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // An unrecognised ?status= falls back to "all" rather than erroring.
  const filter: InvoiceFilter = isInvoiceFilter(status) ? status : 'all';

  const [result, summary, engagements] = await Promise.all([
    mockApi.invoices.list({ filter }),
    mockApi.invoices.summary(),
    mockApi.invoices.engagements(),
  ]);

  return (
    <Invoices
      locale={locale as Locale}
      filter={filter}
      counts={result.counts}
      invoices={result.items}
      summary={summary}
      engagements={engagements.map((engagement) => ({
        reference: engagement.reference,
        title: engagement.title[locale as Locale],
      }))}
    />
  );
}

function Invoices({
  locale,
  filter,
  counts,
  invoices,
  summary,
  engagements,
}: {
  locale: Locale;
  filter: InvoiceFilter;
  counts: Record<InvoiceFilter, number>;
  invoices: InvoiceRecord[];
  summary: InvoiceSummary;
  engagements: { reference: string; title: string }[];
}) {
  const t = useTranslations('invoices');

  // Flattened here, where the locale is, so the client component never has to
  // resolve a language. Money and dates are formatted here too, through
  // lib/format.ts — nothing in app/ builds an Intl formatter itself.
  const rows: InvoiceRowData[] = invoices.map((invoice) => ({
    id: invoice.id,
    reference: invoice.reference,
    href: `/invoices/${invoice.reference}`,
    description: invoice.description[locale],
    engagementRef: invoice.engagementRef,
    engagementKind: invoice.engagementKind,
    engagementTitle: invoice.engagementTitle[locale],
    engagementHref:
      invoice.engagementKind === 'matter'
        ? `/matters/${invoice.engagementRef}`
        : `/projects/${invoice.engagementRef}`,
    issuedOn: invoice.issuedOn,
    issuedLabel: formatCalendarDate(invoice.issuedOn, locale),
    dueOn: invoice.dueOn,
    dueLabel: formatCalendarDate(invoice.dueOn, locale),
    amount: invoice.amount,
    amountLabel: formatMoney(invoice.amount, invoice.currency, locale),
    status: invoice.status,
  }));

  return (
    <>
      <ClientTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        {/*
          An empty ledger gets the empty state ALONE — not the summary strip
          reading zero three times.

          The export keeps all three cards at $0.00 and calls it a "reassuring
          neutral financial summary". The reassurance is real and worth keeping,
          but three zeroed figures are a worse way to say it than one sentence:
          a row of 0.00s over an empty table reads as a dashboard that failed to
          load, which is the opposite of reassuring. The copy says "nothing is
          outstanding" and the cards come back when there is something to count.
        */}
        {counts.all === 0 ? (
          <EmptyState icon={Receipt} title={t('emptyNone')} body={t('emptyNoneBody')} />
        ) : (
          <>
        {/* Summary strip — three figures, all from one pass over the ledger. */}
        <section aria-label={t('summary.label')} className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
          <SummaryCard
            icon={CircleDollarSign}
            label={t('summary.outstanding')}
            value={formatMoney(summary.balanceDue, summary.currency, locale)}
            caption={t('summary.outstandingCount', { count: summary.outstandingCount })}
          />
          <SummaryCard
            icon={TriangleAlert}
            label={t('summary.overdue')}
            value={formatMoney(summary.overdueTotal, summary.currency, locale)}
            caption={t('summary.overdueCount', { count: summary.overdueCount })}
            // The one figure on this screen that carries a state colour, and it
            // is paired with an icon and a word — never the hue alone.
            tone={summary.overdueCount > 0 ? 'error' : 'neutral'}
          />
          <SummaryCard
            icon={CheckCircle2}
            label={t('summary.settled')}
            value={formatMoney(summary.paidTotal, summary.currency, locale)}
            caption={t('summary.settledCount', { count: summary.paidCount })}
          />
        </section>

        {/* The same strip the matters, projects and documents lists use —
            status in the URL, counts from the same pass as the rows. */}
        <EngagementFilterNav
          values={INVOICE_FILTERS}
          active={filter}
          counts={counts}
          pathname="/invoices"
          namespace="invoices"
        />

        <InvoicesTable
          rows={rows}
          engagementOptions={engagements.map((engagement) => ({
            reference: engagement.reference,
            label: `${engagement.reference} — ${engagement.title}`,
          }))}
        />
          </>
        )}
      </main>
    </>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <Card padding="lg" className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Icon
          aria-hidden
          size={15}
          strokeWidth={1.8}
          className={tone === 'error' ? 'shrink-0 text-error' : 'shrink-0 text-gray-500'}
        />
        <span className="text-caption text-gray-500">{label}</span>
      </div>

      {/*
        JetBrains Mono, per design.md §3 and §9 — digits stay tabular so the
        three cards' figures line up against each other. Isolated but NOT
        direction-forced: in Arabic `formatMoney` returns the ISO code after the
        number with a right-to-left mark of its own, and forcing `ltr` would
        fight it. See the rendering rule in lib/format.ts.
      */}
      <p
        className={
          tone === 'error'
            ? 'font-mono text-heading font-medium text-error [unicode-bidi:isolate]'
            : 'font-mono text-heading font-medium text-gray-900 [unicode-bidi:isolate]'
        }
      >
        {value}
      </p>

      <p className="text-caption text-gray-500">{caption}</p>
    </Card>
  );
}
