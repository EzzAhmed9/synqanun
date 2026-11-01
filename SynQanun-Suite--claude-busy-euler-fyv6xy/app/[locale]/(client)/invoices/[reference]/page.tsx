import { ChevronLeft, Download, MessageSquare, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui';
import { daysBetween, formatCalendarDate, formatMoney, tenantToday } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type InvoiceRecord } from '@/lib/mock-api';
import { ClientTopBar } from '../../ClientPortalChrome';
import { INVOICE_STATUS_TONE } from '@/lib/status-tones';
import { PaymentPanel } from './PaymentPanel';

/**
 * One fee statement, with its line-item breakdown.
 *
 * A FULL ROUTE, NOT A DRAWER
 * ---------------------------------------------------------------------------
 * The export ships both: a docked drawer on the list AND a standalone page. The
 * page is the one built. An invoice is a document a client reads, quotes back,
 * links to and prints; a drawer has no address, so none of that works. Same
 * reasoning as the matter and project details, and the opposite of the
 * documents library's panel — a document's real address is the file itself, and
 * an invoice's is this URL.
 *
 * THE BREAKDOWN AND THE TOTAL CANNOT DISAGREE
 * ---------------------------------------------------------------------------
 * The total is the sum of the line items, computed in lib/mock-api.ts, because
 * it is not stored anywhere else. That is the one arithmetic error a fee
 * statement must never contain, and the fixture can no longer express it.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER — see the list page for the full list. The ones specific to
 * this view: the escrow/wire card with its IBAN and SWIFT, the VAT line and UAE
 * TRN, the invoice audit trail, "Formal Tax Invoice • Generated per UAE Federal
 * Decree-Law No. 8 on Value Added Tax" under the heading, and the billing
 * address of a "SynQanun Client Trust Account".
 */

/** Rendered per request — the due date and the overdue count are clock-relative. */
export const dynamic = 'force-dynamic';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale, reference } = await params;
  setRequestLocale(locale);

  const invoice = await mockApi.invoices.getByReference(reference);
  // A real 404, in the portal shell. Consistent with matters and projects.
  if (!invoice) notFound();

  return <InvoiceDetail locale={locale as Locale} invoice={invoice} today={tenantToday()} />;
}

function InvoiceDetail({
  locale,
  invoice,
  today,
}: {
  locale: Locale;
  invoice: InvoiceRecord;
  today: string;
}) {
  const t = useTranslations('invoices');
  const td = useTranslations('invoices.detail');

  const amountLabel = formatMoney(invoice.amount, invoice.currency, locale);
  const engagementHref =
    invoice.engagementKind === 'matter'
      ? `/matters/${invoice.engagementRef}`
      : `/projects/${invoice.engagementRef}`;

  // Computed, not asserted. The export writes "Overdue (13 days)" into the
  // markup beside a due date fixed to March 2025 — a number that was true on
  // the day it was generated and has been wrong every day since.
  const daysOverdue = invoice.status === 'overdue' ? daysBetween(invoice.dueOn, today) : 0;

  return (
    <>
      {/* The reference IS this invoice's name, so it is the page title. */}
      <ClientTopBar title={invoice.reference} subtitle={invoice.description[locale]} />

      {/* Hero -------------------------------------------------------------- */}
      <div className="border-b border-gray-200 bg-white px-6 pt-5 pb-5">
        <div className="mx-auto w-full max-w-content">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1 text-caption font-medium text-gray-500 hover:text-gray-700"
          >
            {/* Directional icon — flips with `dir` (design.md §12). */}
            <ChevronLeft aria-hidden size={14} strokeWidth={2} className="rtl:rotate-180" />
            {td('back')}
          </Link>

          <div className="mt-3 flex flex-col gap-4 desktop:flex-row desktop:items-end desktop:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>
                  {t(`status.${invoice.status}`)}
                </Badge>
                {daysOverdue > 0 ? (
                  <span className="text-caption text-gray-500">
                    {td('daysOverdue', { count: daysOverdue })}
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-caption text-gray-500">
                {invoice.status === 'paid' ? td('amountPaid') : td('amountDue')}
              </p>
              {/* Mono per design.md §3 and §9, isolated but NOT direction-forced
                  — the Arabic form places the ISO code after the number and
                  carries its own right-to-left mark. */}
              <p className="mt-0.5 font-mono text-display font-medium text-gray-900 [unicode-bidi:isolate]">
                {amountLabel}
              </p>
            </div>

            {/*
              A settled invoice has a receipt view to go to, so the button is a
              link rather than the inert download it was. It stays secondary:
              the primary on this view is settling the invoice, which lives once,
              below.

              MOCK: for an UNPAID invoice there is still no file — the real
              version renders the statement server-side and streams it behind the
              same access check as the invoice itself. Track A.5.
            */}
            {invoice.status === 'paid' ? (
              <Link href={`/invoices/${invoice.reference}/receipt`}>
                <Button variant="secondary" icon={<Receipt aria-hidden size={15} />}>
                  {td('viewReceipt')}
                </Button>
              </Link>
            ) : (
              <Button variant="secondary" icon={<Download aria-hidden size={15} />}>
                {td('downloadPdf')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-6 px-6 py-6">
        {/* Facts ----------------------------------------------------------- */}
        <Card padding="lg">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
            <h2 className="font-sans text-title text-gray-700">{td('context')}</h2>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-4 tablet:grid-cols-2">
            <div>
              <dt className="text-caption text-gray-500">{td('engagement')}</dt>
              <dd className="mt-0.5">
                {/* Matters and projects are not interchangeable — this links to
                    whichever kind the fees were actually incurred on. */}
                <Link
                  href={engagementHref}
                  className="text-body text-gray-700 hover:text-action hover:underline"
                >
                  {invoice.engagementTitle[locale]}
                </Link>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-caption text-gray-500">
                    {t(`kind.${invoice.engagementKind}`)}
                  </span>
                  <span
                    dir="ltr"
                    className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]"
                  >
                    {invoice.engagementRef}
                  </span>
                </span>
              </dd>
            </div>

            <Fact
              label={td('reference')}
              value={invoice.reference}
              // Latin in every locale — the one field here that wants a forced
              // direction.
              latin
            />
            <Fact label={td('issued')} value={formatCalendarDate(invoice.issuedOn, locale)} />
            <Fact label={td('due')} value={formatCalendarDate(invoice.dueOn, locale)} />
            {/*
              `paidOn` is its OWN date, never the due date. The matter detail
              first rendered "Paid 14 Feb 2026" by reusing `dueOn`, which is a
              different fact wearing the same label — and this invoice is the
              case that proves it matters: INV-…-072 fell due 44 days ago and
              was settled 51 days ago, i.e. before it was due; INV-…-014 was
              settled four days before ITS due date. Reusing one for the other
              would silently restate both.
            */}
            {invoice.paidOn ? (
              <Fact label={td('paid')} value={formatCalendarDate(invoice.paidOn, locale)} />
            ) : null}
            <Fact label={td('currency')} value={invoice.currency} latin />
          </dl>
        </Card>

        {/* Line items ------------------------------------------------------ */}
        <Card padding="none">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 p-5">
            <h2 className="font-sans text-title text-gray-700">{td('lineItems')}</h2>
            <p className="text-caption text-gray-500">
              {td('lineItemCount', { count: invoice.lineItems.length })}
            </p>
          </div>

          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>{td('columns.description')}</TableHeaderCell>
                <TableHeaderCell numeric>{td('columns.amount')}</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {invoice.lineItems.map((item) => (
                <TableRow key={item.id}>
                  {/* No `label`: this cell is the card's heading below 768px. */}
                  <TableCell className="py-3">
                    <span className="block text-body text-gray-700">
                      {item.description[locale]}
                    </span>
                    <span className="mt-0.5 block text-caption text-gray-500">
                      {item.detail[locale]}
                    </span>
                  </TableCell>
                  <TableCell numeric label={td('columns.amount')} className="py-3">
                    <span className="whitespace-nowrap [unicode-bidi:isolate]">
                      {formatMoney(item.amount, invoice.currency, locale)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* The total sits outside the table rather than in a <tfoot>: below
              768px the rows become cards, and a total rendered as one more card
              would read as one more charge. */}
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-gray-200 bg-gray-50 p-5">
            <span className="text-body-emphasis text-gray-700">{td('total')}</span>
            <span className="font-mono text-title font-medium text-gray-900 [unicode-bidi:isolate]">
              {amountLabel}
            </span>
          </div>
        </Card>

        {/* Settle ---------------------------------------------------------- */}
        {invoice.status === 'paid' ? (
          <Card padding="lg" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-body-emphasis text-gray-700">{td('settledHeading')}</p>
              <p className="mt-0.5 text-caption text-gray-500">
                {invoice.paidOn
                  ? td('settledOn', { date: formatCalendarDate(invoice.paidOn, locale) })
                  : td('settledHeading')}
              </p>
            </div>
            <Badge tone="success">{t('status.paid')}</Badge>
          </Card>
        ) : (
          <PaymentPanel amountLabel={amountLabel} />
        )}

        {/* MOCK: the Messages screen lands later in Batch 2. The real shortcut
            opens a composer already referencing this invoice. Not an email
            address: the export links "billing@firm-portal.ae", a domain the
            demo firm does not own (fixtures/firm.ts) and a billing mailbox no
            fixture holds. */}
        <div>
          <Button variant="secondary" icon={<MessageSquare aria-hidden size={15} />}>
            {td('query')}
          </Button>
        </div>
      </main>
    </>
  );
}

function Fact({ label, value, latin = false }: { label: string; value: string; latin?: boolean }) {
  return (
    <div>
      <dt className="text-caption text-gray-500">{label}</dt>
      <dd
        {...(latin ? { dir: 'ltr' as const } : {})}
        className={
          latin
            ? 'mt-0.5 font-mono text-reference text-gray-700 [unicode-bidi:isolate]'
            : 'mt-0.5 text-body text-gray-700 [unicode-bidi:isolate]'
        }
      >
        {value}
      </dd>
    </div>
  );
}
