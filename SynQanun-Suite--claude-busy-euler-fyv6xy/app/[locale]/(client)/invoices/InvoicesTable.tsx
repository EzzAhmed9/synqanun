'use client';

import * as React from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Badge,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type SortDirection,
} from '@/components/ui';
import type { InvoiceStatus } from '@/fixtures/invoices';
import { intlLocale, type CalendarDate } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { INVOICE_STATUS_TONE } from '@/lib/status-tones';

/**
 * The invoice ledger table, with its free-text search and engagement filter.
 *
 * THE SPLIT, AGAIN
 * ---------------------------------------------------------------------------
 * Status in the URL and applied on the server (see EngagementFilterNav, reused
 * unchanged); search and the engagement dropdown in client state. "Show me what
 * is overdue" is a view worth linking and discloses nothing; a search term on
 * this screen can be a counterparty's name or a sum, and the URL is the one
 * place it must not go — history, shared links, and the Referer header of every
 * outbound request all carry it.
 *
 * There is no <form> here, so nothing submits and no full-page GET can put
 * anything in the query string. Filtering happens as you type.
 *
 * NO "PAY NOW" BUTTON IN THE ROWS
 * ---------------------------------------------------------------------------
 * Both exports put one in every unpaid row, plus a "Pay All Outstanding
 * ($30,500.00)" in the top bar. That is three to five syn-red primaries on one
 * screen; design.md §4 spends red once per view, for the one main action. Here
 * the row's action is to OPEN the invoice — you should read a fee statement
 * before paying it — and the primary lives on the detail view, once.
 */

export interface InvoiceRowData {
  id: string;
  /** "INV-2026-092" — Latin in every locale. */
  reference: string;
  href: string;
  description: string;
  engagementRef: string;
  engagementKind: 'matter' | 'project';
  engagementTitle: string;
  engagementHref: string;
  /** Raw 'YYYY-MM-DD', so sorting compares dates rather than month names. */
  issuedOn: CalendarDate;
  issuedLabel: string;
  dueOn: CalendarDate;
  dueLabel: string;
  /** Raw number, so sorting compares values rather than formatted strings. */
  amount: number;
  amountLabel: string;
  status: InvoiceStatus;
}

export interface InvoicesTableProps {
  rows: InvoiceRowData[];
  /** Engagements carrying an invoice, for the dropdown. */
  engagementOptions: { reference: string; label: string }[];
}

type SortKey = 'issued' | 'amount';

export function InvoicesTable({ rows, engagementOptions }: InvoicesTableProps) {
  const t = useTranslations('invoices');
  const locale = useLocale() as Locale;

  const [query, setQuery] = React.useState('');
  const [engagement, setEngagement] = React.useState('');
  const [sort, setSort] = React.useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'issued',
    direction: 'desc',
  });

  const collator = React.useMemo(
    () => new Intl.Collator(intlLocale(locale), { sensitivity: 'base', numeric: true }),
    [locale]
  );

  const visible = React.useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);

    const filtered = rows.filter((row) => {
      if (engagement && row.engagementRef !== engagement) return false;
      if (!needle) return true;
      return [row.reference, row.description, row.engagementTitle, row.engagementRef].some(
        (field) => field.toLocaleLowerCase(locale).includes(needle)
      );
    });

    const sorted = [...filtered].sort((a, b) =>
      sort.key === 'amount'
        ? // Numeric comparison, not the formatted string: "USD 8,750.00" sorts
          // before "USD 12,000.00" alphabetically, which is not an order anyone
          // reading a ledger wants.
          a.amount - b.amount
        : // 'YYYY-MM-DD' compares chronologically as a plain string. The
          // collator is only used for the tie-break on the reference.
          a.issuedOn === b.issuedOn
          ? collator.compare(a.reference, b.reference)
          : a.issuedOn.localeCompare(b.issuedOn)
    );

    return sort.direction === 'desc' ? sorted.reverse() : sorted;
  }, [rows, query, engagement, sort, collator, locale]);

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    );
  }

  const directionFor = (key: SortKey): SortDirection =>
    sort.key === key ? sort.direction : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls ---------------------------------------------------------- */}
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <div className="relative w-full tablet:max-w-sm">
          <Input
            id="invoices-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            // Room on BOTH sides for the two adornments, with logical
            // properties. The field keeps the interface direction — a search
            // term here can be Arabic, so it is not a `latinValue` field, and
            // the padding and the icons resolve against the same direction.
            className="ps-9 pe-9"
          />
          <Search
            aria-hidden
            size={16}
            strokeWidth={1.8}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-500"
            style={{ insetInlineStart: '0.75rem' }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('clearSearch')}
              className="absolute top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-200 hover:text-gray-700"
              style={{ insetInlineEnd: '0.5rem' }}
            >
              <X aria-hidden size={14} strokeWidth={2} />
            </button>
          ) : null}
        </div>

        {/* Options come from the ledger, so the dropdown cannot offer an
            engagement with no fees on it. <Select> is `w-full` inside its own
            wrapper, so the width is set here. */}
        <div className="w-full tablet:w-72">
          <Select
            aria-label={t('engagementLabel')}
            value={engagement}
            onChange={(event) => setEngagement(event.target.value)}
          >
            <option value="">{t('allEngagements')}</option>
            {engagementOptions.map((option) => (
              <option key={option.reference} value={option.reference}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Table ------------------------------------------------------------- */}
      {visible.length === 0 ? (
        <p className="rounded-card border border-gray-200 bg-gray-100 p-6 text-body text-gray-500">
          {query.trim() ? t('emptySearch', { query: query.trim() }) : t('emptyFilter')}
        </p>
      ) : (
        <div className="overflow-hidden tablet:rounded-card tablet:border tablet:border-gray-200 tablet:bg-white">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>{t('columns.reference')}</TableHeaderCell>
                <TableHeaderCell>{t('columns.engagement')}</TableHeaderCell>
                <TableHeaderCell
                  sortable
                  sortDirection={directionFor('issued')}
                  onSort={() => toggleSort('issued')}
                >
                  {t('columns.issued')}
                </TableHeaderCell>
                <TableHeaderCell>{t('columns.due')}</TableHeaderCell>
                <TableHeaderCell
                  numeric
                  sortable
                  sortDirection={directionFor('amount')}
                  onSort={() => toggleSort('amount')}
                >
                  {t('columns.amount')}
                </TableHeaderCell>
                <TableHeaderCell>{t('columns.status')}</TableHeaderCell>
                <TableHeaderCell className="max-tablet:hidden">
                  <span className="sr-only">{t('columns.open')}</span>
                </TableHeaderCell>
              </tr>
            </TableHead>

            <TableBody>
              {visible.map((row) => (
                <TableRow key={row.id}>
                  {/* No `label`: this cell is the card's heading below 768px. */}
                  <TableCell className="py-3">
                    {/* `block`, not the default inline — a wrapped inline link's
                        bounding-box centre falls BETWEEN its line boxes, which
                        is how the matters list first shipped a link you could
                        miss by clicking the middle of it. */}
                    <Link
                      href={row.href}
                      // An invoice number is Latin in every locale: forced LTR
                      // and isolated so RTL cannot split it around its hyphens.
                      // Contrast the dates and amounts below, which must NOT be
                      // forced — see the rendering rule in lib/format.ts.
                      dir="ltr"
                      className="block font-mono text-reference font-medium text-gray-700 [unicode-bidi:isolate] hover:text-action hover:underline"
                    >
                      {row.reference}
                    </Link>
                    <span className="mt-0.5 block text-caption text-gray-500">
                      {row.description}
                    </span>
                  </TableCell>

                  <TableCell label={t('columns.engagement')} className="py-3">
                    {/* Matters and projects are not interchangeable — the row
                        links to whichever kind this invoice actually belongs
                        to, and says which. */}
                    <Link
                      href={row.engagementHref}
                      className="block text-body text-gray-700 hover:text-action hover:underline"
                    >
                      {row.engagementTitle}
                    </Link>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-caption text-gray-500">
                        {t(`kind.${row.engagementKind}`)}
                      </span>
                      <span
                        dir="ltr"
                        className="font-mono text-reference text-gray-500 [unicode-bidi:isolate]"
                      >
                        {row.engagementRef}
                      </span>
                    </span>
                  </TableCell>

                  <TableCell label={t('columns.issued')} className="py-3">
                    <time dateTime={row.issuedOn} className="whitespace-nowrap [unicode-bidi:isolate]">
                      {row.issuedLabel}
                    </time>
                  </TableCell>

                  <TableCell label={t('columns.due')} emphasis className="py-3">
                    {/* The date stays neutral in colour whatever the status —
                        design.md §2 and brand-guidelines.md §3.4 forbid colour
                        alone, and the badge beside it already carries the state
                        with an icon and a word. A red date would be the second,
                        weaker copy of the same signal. */}
                    <time dateTime={row.dueOn} className="whitespace-nowrap [unicode-bidi:isolate]">
                      {row.dueLabel}
                    </time>
                  </TableCell>

                  <TableCell numeric label={t('columns.amount')} className="py-3">
                    {/* Isolated, NOT forced LTR: the Arabic form places the ISO
                        code after the number and carries its own right-to-left
                        mark from CLDR. */}
                    <span className="whitespace-nowrap [unicode-bidi:isolate]">
                      {row.amountLabel}
                    </span>
                  </TableCell>

                  <TableCell label={t('columns.status')} className="py-3">
                    <Badge tone={INVOICE_STATUS_TONE[row.status]}>
                      {t(`status.${row.status}`)}
                    </Badge>
                  </TableCell>

                  <TableCell className="py-3 text-end max-tablet:hidden">
                    <Link
                      href={row.href}
                      aria-label={t('openInvoice', { reference: row.reference })}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      {/* Directional icon — flips with `dir` (design.md §12). */}
                      <ChevronRight aria-hidden size={16} strokeWidth={2} className="rtl:rotate-180" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-caption text-gray-500">
        {t('showing', { shown: visible.length, total: rows.length })}
      </p>
    </div>
  );
}

export default InvoicesTable;
