import * as React from 'react';
import { ChevronRight, FileText, MessageSquare, Receipt, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Card } from '@/components/ui';
import {
  formatCalendarDate,
  formatClockTime,
  formatFileSize,
  formatMoney,
  type CalendarDate,
} from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type {
  InvoiceRecord,
  InvoiceSummary,
  MessageThreadRecord,
  SharedDocumentRecord,
} from '@/lib/mock-api';

/* ===========================================================================
 * Shared shell
 *
 * Three cards, one chrome — icon, title, a status chip at the end, a body, and
 * a "view all" footer. Three real instances on one screen, so the shell is
 * extracted rather than written out three times and left to drift.
 * ======================================================================== */

function SummaryCard({
  icon: Icon,
  title,
  chip,
  viewAllLabel,
  viewAllHref,
  children,
}: {
  icon: LucideIcon;
  title: string;
  chip?: React.ReactNode;
  viewAllLabel: string;
  viewAllHref: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="none" className="flex flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden size={16} strokeWidth={1.8} className="shrink-0 text-gray-600" />
          <h2 className="truncate font-sans text-title text-gray-700">{title}</h2>
        </div>
        {chip ? <div className="shrink-0">{chip}</div> : null}
      </header>

      <div className="flex-1 p-4">{children}</div>

      <footer className="border-t border-gray-200 px-4 py-3">
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-caption font-medium text-legal-navy hover:underline"
        >
          {viewAllLabel}
          {/* Directional icon, flipped by `dir` — design.md §12. */}
          <ChevronRight aria-hidden size={14} strokeWidth={2} className="rtl:rotate-180" />
        </Link>
      </footer>
    </Card>
  );
}

/* ===========================================================================
 * Shared documents
 * ======================================================================== */

export function SharedDocumentsCard({
  documents,
  today,
  locale,
}: {
  documents: SharedDocumentRecord[];
  today: CalendarDate;
  locale: Locale;
}) {
  const t = useTranslations('dashboard.documents');

  return (
    <SummaryCard
      icon={FileText}
      title={t('title')}
      // Counts what is actually listed, not the collection's total. This card
      // shows the three most recent of however many exist, and "5 recent files"
      // over three rows is the same defect as the matters list's contradictory
      // filter counts — the "View all" link is what covers the rest.
      chip={
        <span className="text-caption text-gray-500">
          {t('count', { count: documents.length })}
        </span>
      }
      viewAllLabel={t('viewAll')}
      viewAllHref="/documents"
    >
      {documents.length === 0 ? (
        <p className="text-body text-gray-500">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((document) => (
            <li key={document.id} className="flex items-start gap-2">
              <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-reference font-medium text-gray-600">
                {document.kind.toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                {/*
                  `dir="auto"` rather than a fixed direction. A filename is not
                  translated (see fixtures/documents.ts), so this list holds
                  Latin and Arabic names together in BOTH locales, and the right
                  direction for each is the one its own first strong character
                  implies. `dir="auto"` isolates the run as well, which is what
                  design.md §12 asks for when scripts mix in one field.
                  Hardcoding `ltr` would mangle the Arabic names; inheriting
                  `rtl` would mangle the Latin ones.

                  Clamped to two lines rather than truncated to one. In a
                  third-width card a single line turns
                  "Shareholders_Resolution_SPV_Final.pdf" into "Shareholde…",
                  which tells a client nothing about which document is waiting
                  for their signature. `overflow-wrap: anywhere` is what lets an
                  unbroken underscored filename wrap at all.
                */}
                <p className="line-clamp-2 text-body text-gray-700 [overflow-wrap:anywhere]">
                  <bdi>{document.name}</bdi>
                </p>
                <p className="truncate text-caption text-gray-500">
                  {document.sharedOn === today
                    ? t('sharedToday')
                    : t('sharedOn', {
                        date: formatCalendarDate(document.sharedOn, locale, { year: false }),
                      })}
                  <span aria-hidden className="mx-1.5">
                    ·
                  </span>
                  {/* Isolated, not forced LTR — in Arabic this is "840
                      كيلوبايت", an Arabic unit name that must stay behind its
                      number. See the rendering rule in lib/format.ts. */}
                  <span className="[unicode-bidi:isolate]">
                    {formatFileSize(document.sizeBytes, locale)}
                  </span>
                </p>

                {/* Below the name, not beside it: at a third of the content
                    width a badge on the same row leaves the filename no room. */}
                {document.needsSignature ? (
                  <Badge tone="warning" className="mt-1.5">
                    {t('needsSignature')}
                  </Badge>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

/* ===========================================================================
 * Invoices
 * ======================================================================== */

export function InvoicesCard({
  summary,
  outstanding,
  locale,
}: {
  summary: InvoiceSummary;
  /** The unpaid invoices behind `summary.balanceDue`. */
  outstanding: InvoiceRecord[];
  locale: Locale;
}) {
  const t = useTranslations('dashboard.invoices');

  return (
    <SummaryCard
      icon={Receipt}
      title={t('title')}
      chip={
        summary.overdueCount > 0 ? (
          <Badge tone="warning">{t('overdueBadge', { count: summary.overdueCount })}</Badge>
        ) : (
          <Badge tone="success">{t('settled')}</Badge>
        )
      }
      viewAllLabel={t('viewAll')}
      viewAllHref="/invoices"
    >
      <div className="rounded-card border border-gray-200 bg-gray-100 p-3">
        <p className="text-caption text-gray-500">{t('balanceDue')}</p>
        {/*
          Money is isolated but NOT forced to `ltr`. The Arabic form puts the
          ISO code after the number and carries a right-to-left mark from CLDR;
          forcing a direction would fight it. See lib/format.ts `formatMoney`
          for why the code is shown instead of a currency symbol.
        */}
        <p className="mt-0.5 font-mono text-heading font-medium text-gray-900 [unicode-bidi:isolate]">
          {formatMoney(summary.balanceDue, summary.currency, locale)}
        </p>
        <p className="mt-1 text-caption text-gray-500">
          {t('outstanding', { count: summary.outstandingCount })}
        </p>
      </div>

      {outstanding.length === 0 ? (
        <p className="mt-3 text-body text-gray-500">{t('empty')}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {outstanding.map((invoice) => (
            <li key={invoice.id} className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <span
                  dir="ltr"
                  className="font-mono text-reference text-gray-700 [unicode-bidi:isolate]"
                >
                  {invoice.reference}
                </span>
                <p className="truncate text-caption text-gray-500">
                  {invoice.status === 'overdue'
                    ? t('overdueSince', {
                        date: formatCalendarDate(invoice.dueOn, locale, { year: false }),
                      })
                    : t('dueOn', {
                        date: formatCalendarDate(invoice.dueOn, locale, { year: false }),
                      })}
                </p>
              </div>
              <span className="shrink-0 font-mono text-reference text-gray-900 [unicode-bidi:isolate]">
                {formatMoney(invoice.amount, invoice.currency, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}

/* ===========================================================================
 * Messages
 * ======================================================================== */

export function MessagesCard({
  threads,
  unreadCount,
  today,
  locale,
}: {
  threads: MessageThreadRecord[];
  unreadCount: number;
  today: CalendarDate;
  locale: Locale;
}) {
  const t = useTranslations('dashboard.messages');

  return (
    <SummaryCard
      icon={MessageSquare}
      title={t('title')}
      chip={
        unreadCount > 0 ? (
          /*
            syn-red, matching the TopBar's notification count. design.md §2
            assigns red to the human's own side of the product — this is the
            firm's work waiting on the client, not anything the agent produced,
            so red is correct and navy would be wrong. White on syn-red, never
            syn-red as text (§3 forbids red body copy).

            Not a <Badge>: the kit has no red tone on purpose, so that a red
            pill stays a deliberate choice at the two places it belongs rather
            than a value anyone can pass.
          */
          <span className="inline-flex items-center rounded-pill bg-action px-2 py-0.5 text-caption font-medium text-white">
            {t('unread', { count: unreadCount })}
          </span>
        ) : (
          <span className="text-caption text-gray-500">{t('unread', { count: 0 })}</span>
        )
      }
      viewAllLabel={t('viewAll')}
      viewAllHref="/messages"
    >
      {threads.length === 0 ? (
        <p className="text-body text-gray-500">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((thread) => (
            <li
              key={thread.id}
              className={
                thread.unread
                  ? // An unread thread is marked by a start-edge rule, which
                    // flips sides with `dir`, rather than by weight alone.
                    'border-s-2 border-action ps-3'
                  : 'border-s-2 border-transparent ps-3'
              }
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-body-emphasis text-gray-700">
                  {thread.senderName[locale]}
                </p>
                {/* Isolated, not forced LTR: in Arabic this is "11:30 ص" or
                    "16 سبتمبر". Caption scale and gray-500 — design.md §3 puts
                    timestamps there, and mono would send the Arabic into a
                    fallback face. */}
                <time
                  className="shrink-0 text-caption text-gray-500 [unicode-bidi:isolate]"
                  dateTime={`${thread.sentOn}T${thread.sentAt}`}
                >
                  {thread.sentOn === today
                    ? formatClockTime(thread.sentAt, locale)
                    : formatCalendarDate(thread.sentOn, locale, { year: false })}
                </time>
              </div>
              <p className="truncate text-caption text-gray-500">{thread.senderRole[locale]}</p>
              <p className="mt-1 truncate text-body text-gray-700">{thread.subject[locale]}</p>
              <p className="mt-0.5 line-clamp-2 text-caption text-gray-500">
                {thread.preview[locale]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SummaryCard>
  );
}
