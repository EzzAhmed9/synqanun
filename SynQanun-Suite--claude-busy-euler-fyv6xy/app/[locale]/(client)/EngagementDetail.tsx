import { ChevronLeft, Download, MessageSquare, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Card, tabTriggerClasses } from '@/components/ui';
import type { EngagementStatusTone } from '@/fixtures/engagements';
import {
  formatCalendarDate,
  formatFileSize,
  formatMoney,
  type CalendarDate,
} from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { InvoiceRecord, KeyDate, SharedDocumentRecord } from '@/lib/mock-api';
import { cn, initialsOf } from '@/lib/utils';
import { ClientTopBar } from './ClientPortalChrome';
import { INVOICE_STATUS_TONE } from '@/lib/status-tones';
import { KeyDatesStrip } from './KeyDatesStrip';
import { UploadDocumentButton } from './UploadDocumentModal';

/**
 * The detail view behind a matter and behind a project.
 *
 * WHY ONE COMPONENT
 * ---------------------------------------------------------------------------
 * A matter and a project are both ENGAGEMENTS — work the firm is instructed to
 * do — and their detail screens are the same screen: a header with status, four
 * tabs, a facts panel, a contact card, a timeline, a document list and a ledger.
 * The Stitch exports for the two are near-identical markup with different
 * nouns.
 *
 * So this is built once and parameterised, rather than copied. The second real
 * instance is the threshold on this project for extracting anything, and two
 * six-hundred-line pages that have to be kept in step by hand is precisely the
 * drift BUILD_PLAN.md §3 exists to prevent.
 *
 * HOW THE NOUNS DIFFER
 * ---------------------------------------------------------------------------
 * Two mechanisms, and the split is deliberate:
 *
 *   · `namespace` selects a translation namespace whose key SHAPE is identical
 *     ('matters.detail' / 'projects.detail'). That covers everything structural
 *     — tab labels, panel headings, the contact card's rows, invoice statuses.
 *     A project's contact card says "Responsible lead" where a matter's says
 *     "Responsible counsel", and neither this file nor the pages have to know.
 *
 *   · `facts` is built by the CALLER. A matter has a court file number and an
 *     opposing party; a project has a registration number and target entities.
 *     Those are not the same field under two names, so they are not pretended
 *     to be — the page assembles its own rows and passes them in.
 *
 * THE TABS ARE LINKS, NOT A <Tabs> COMPONENT
 * ---------------------------------------------------------------------------
 * Each tab is its own URL, which makes it linkable, bookmarkable and reachable
 * with the back button. That also changes the correct semantics:
 * `role="tablist"` describes panels that swap in place, and this is navigation,
 * so it is a <nav> of real links. <Tabs> stays right for in-page panels. Both
 * wear `tabTriggerClasses`, so one look cannot become two.
 *
 * Nothing here submits anything — there is no form on the screen, and the only
 * thing that reaches the URL is which tab is open.
 */

export const ENGAGEMENT_TABS = ['overview', 'documents', 'timeline', 'invoices'] as const;
export type EngagementTab = (typeof ENGAGEMENT_TABS)[number];

export function isEngagementTab(value: string | undefined): value is EngagementTab {
  return value !== undefined && (ENGAGEMENT_TABS as readonly string[]).includes(value);
}

/** One row in the overview panel. Assembled per engagement kind by the page. */
export interface EngagementFact {
  label: string;
  value: string;
  /** Latin identifier in every locale — rendered mono and forced LTR. */
  mono?: boolean;
}

/** The firm-side person, already resolved for the locale. */
export interface EngagementContactView {
  name: string;
  role: string;
  /** Absent when the firm has not published a direct line for this file. */
  phone: string | null;
  email: string;
  supporting: string | null;
}

export interface EngagementDetailProps {
  locale: Locale;
  /** 'matters.detail' or 'projects.detail' — identical key shapes. */
  namespace: string;
  /** Path the tab links hang off, e.g. `/matters/MAT-2201`. */
  basePath: string;
  /** Where the back link goes, e.g. `/matters`. */
  backHref: string;
  tab: EngagementTab;

  title: string;
  /** Shown under the title in the top bar — the matter type or project category. */
  kindLabel: string;
  reference: string;
  /** Forum for a matter, jurisdiction for a project. */
  venue: string;

  status: string;
  statusTone: EngagementStatusTone;
  needsAttention: boolean;
  needsAttentionLabel: string;
  attentionReason: string | null;
  /**
   * Badge for an engagement that is no longer live — "Closed" for a matter,
   * "Completed" for a project. `null` while it is live.
   */
  inactiveLabel: string | null;

  openedOn: CalendarDate;
  facts: EngagementFact[];
  scopeSummary: string;
  contact: EngagementContactView;

  timeline: KeyDate[];
  documents: SharedDocumentRecord[];
  invoices: InvoiceRecord[];
}

export function EngagementDetail({
  locale,
  namespace,
  basePath,
  backHref,
  tab,
  title,
  kindLabel,
  reference,
  venue,
  status,
  statusTone,
  needsAttention,
  needsAttentionLabel,
  attentionReason,
  inactiveLabel,
  openedOn,
  facts,
  scopeSummary,
  contact,
  timeline,
  documents,
  invoices,
}: EngagementDetailProps) {
  const t = useTranslations(namespace);

  const overdueCount = invoices.filter((invoice) => invoice.status === 'overdue').length;
  const upcoming = timeline.filter((event) => !event.completed);

  const tabCounts: Record<EngagementTab, string | null> = {
    overview: null,
    documents: String(documents.length),
    timeline: String(timeline.length),
    invoices:
      overdueCount > 0 ? t('overdueCount', { count: overdueCount }) : String(invoices.length),
  };

  return (
    <>
      <ClientTopBar title={title} subtitle={kindLabel} />

      {/* Hero ------------------------------------------------------------- */}
      <div className="border-b border-gray-200 bg-white px-6 pt-5">
        <div className="mx-auto w-full max-w-content">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-caption font-medium text-gray-500 hover:text-gray-700"
          >
            {/* Directional icon — flips with `dir` (design.md §12). */}
            <ChevronLeft aria-hidden size={14} strokeWidth={2} className="rtl:rotate-180" />
            {t('back')}
          </Link>

          <div className="mt-3 flex flex-col gap-4 desktop:flex-row desktop:items-start desktop:justify-between">
            <div className="min-w-0">
              {/* No heading here — <ClientTopBar> already renders the name as
                  this page's one <h1>, and it stays visible while the panel
                  scrolls. This row carries the state the title cannot. */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone}>{status}</Badge>
                {needsAttention ? <Badge tone="warning">{needsAttentionLabel}</Badge> : null}
                {inactiveLabel ? <Badge tone="neutral">{inactiveLabel}</Badge> : null}
              </div>

              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-gray-500">
                {/* A Latin identifier in both locales — the one thing on this
                    screen that genuinely wants a forced direction. */}
                <span dir="ltr" className="font-mono text-reference [unicode-bidi:isolate]">
                  {reference}
                </span>
                <span aria-hidden>·</span>
                <span>{venue}</span>
                {attentionReason ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="text-warning-text">{attentionReason}</span>
                  </>
                ) : null}
              </p>
            </div>

            {/* Secondary, because the one primary action on this view is
                messaging the firm. The engagement is preselected — opened from
                here, the client has already said which file it belongs to. */}
            <UploadDocumentButton label={t('uploadFile')} defaultEngagementRef={reference} />
          </div>

          <nav
            aria-label={t('tabsLabel')}
            className="mt-4 flex gap-1 overflow-x-auto border-b border-gray-200"
          >
            {ENGAGEMENT_TABS.map((value) => {
              const isActive = value === tab;
              const count = tabCounts[value];

              return (
                <Link
                  key={value}
                  href={{
                    pathname: basePath,
                    query: value === 'overview' ? {} : { tab: value },
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(tabTriggerClasses(isActive), 'whitespace-nowrap')}
                >
                  {t(`tabs.${value}`)}
                  {count ? (
                    <span
                      className={cn(
                        'font-mono text-reference',
                        value === 'invoices' && overdueCount > 0 ? 'text-warning-text' : 'text-gray-500'
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Panels ----------------------------------------------------------- */}
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-6 px-6 py-6">
        {tab === 'overview' ? (
          <OverviewPanel
            locale={locale}
            namespace={namespace}
            basePath={basePath}
            openedOn={openedOn}
            facts={facts}
            scopeSummary={scopeSummary}
            contact={contact}
            upcoming={upcoming}
          />
        ) : null}
        {tab === 'documents' ? (
          <DocumentsPanel locale={locale} namespace={namespace} documents={documents} />
        ) : null}
        {tab === 'timeline' ? (
          <TimelinePanel locale={locale} namespace={namespace} timeline={timeline} />
        ) : null}
        {tab === 'invoices' ? (
          <InvoicesPanel locale={locale} namespace={namespace} invoices={invoices} />
        ) : null}
      </main>
    </>
  );
}

/* ===========================================================================
 * Overview
 * ======================================================================== */

function OverviewPanel({
  locale,
  namespace,
  basePath,
  openedOn,
  facts,
  scopeSummary,
  contact,
  upcoming,
}: {
  locale: Locale;
  namespace: string;
  basePath: string;
  openedOn: CalendarDate;
  facts: EngagementFact[];
  scopeSummary: string;
  contact: EngagementContactView;
  upcoming: KeyDate[];
}) {
  const t = useTranslations(namespace);

  return (
    <>
      <section className="grid grid-cols-1 gap-6 desktop:grid-cols-3">
        <Card padding="lg" className="desktop:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-4">
            <h2 className="font-sans text-title text-gray-700">{t('overview.title')}</h2>
            <p className="text-caption text-gray-500">
              {t('overview.opened', { date: formatCalendarDate(openedOn, locale) })}
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-4 tablet:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-caption text-gray-500">{fact.label}</dt>
                <dd
                  {...(fact.mono ? { dir: 'ltr' as const } : {})}
                  className={cn(
                    'mt-0.5',
                    fact.mono
                      ? 'font-mono text-reference text-gray-700 [unicode-bidi:isolate]'
                      : 'text-body text-gray-700'
                  )}
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 rounded-card border border-gray-200 bg-gray-100 p-4">
            <p className="text-caption font-medium text-gray-700">{t('overview.scope')}</p>
            <p className="mt-1 text-body text-gray-600">{scopeSummary}</p>
          </div>
        </Card>

        <ContactCard locale={locale} namespace={namespace} contact={contact} />
      </section>

      {/*
        The same card the dashboard uses — including its RTL date handling,
        which is the part that was got wrong once and is now fixed in one place
        rather than three. `grid` rather than `strip` because these are the
        panel's whole content, not one band among several.
      */}
      <KeyDatesStrip
        dates={upcoming.slice(0, 4)}
        locale={locale}
        layout="grid"
        showKindBadge={false}
        heading={t('keyDates.heading')}
        caption={t('keyDates.caption', { count: upcoming.length })}
        emptyLabel={t('keyDates.empty')}
      />

      {upcoming.length > 4 ? (
        <Link
          href={{ pathname: basePath, query: { tab: 'timeline' } }}
          className="text-caption font-medium text-legal-navy hover:underline"
        >
          {t('keyDates.viewAll')}
        </Link>
      ) : null}
    </>
  );
}

function ContactCard({
  locale,
  namespace,
  contact,
}: {
  locale: Locale;
  namespace: string;
  contact: EngagementContactView;
}) {
  const t = useTranslations(`${namespace}.contact`);

  const rows: { label: string; value: string; latin: boolean }[] = [
    // Omitted rather than shown blank when no direct line is published for
    // this engagement — an empty row reads as a missing value, and this is an
    // absent disclosure. See EngagementContact.phone.
    ...(contact.phone
      ? [{ label: t('phone'), value: contact.phone, latin: true }]
      : []),
    { label: t('email'), value: contact.email, latin: true },
    ...(contact.supporting
      ? [{ label: t('supporting'), value: contact.supporting, latin: false }]
      : []),
  ];

  return (
    <Card padding="lg" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
        <h2 className="font-sans text-title text-gray-700">{t('title')}</h2>
        <span className="text-caption text-gray-500">{t('lead')}</span>
      </div>

      <div className="mt-4 flex items-start gap-3">
        {/* Initials, not the feather. brand-guidelines.md §5 keeps the feather
            exclusively the AI's identity, so a human's avatar must not wear it. */}
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-gray-200 bg-gray-100 text-body-emphasis text-gray-600">
          {initialsOf(contact.name)}
        </span>
        <div className="min-w-0">
          <p className="text-body-emphasis text-gray-700">{contact.name}</p>
          <p className="text-caption text-gray-500">{contact.role}</p>
        </div>
      </div>

      <dl className="mt-4 flex flex-col gap-2 border-t border-gray-200 pt-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-caption text-gray-500">{row.label}</dt>
            {/* A phone number and an email address are Latin in every locale —
                forced LTR and isolated so RTL cannot split them around their
                punctuation. Contrast the dates, which must NOT be forced. */}
            <dd
              {...(row.latin ? { dir: 'ltr' as const } : {})}
              className={cn(
                'min-w-0 truncate text-end',
                row.latin
                  ? 'font-mono text-reference text-gray-700 [unicode-bidi:isolate]'
                  : 'text-caption text-gray-700'
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        {/*
          The one syn-red primary on this view. design.md §2: red is the
          human's own action, navy is the agent's — the export put this button
          in legal-navy, which §7 calls the single most important rule to get
          right. Not "secure message" either: Track A has no authentication and
          the word would be unearned.

          MOCK: the Messages screen lands later in Batch 2. The real shortcut
          opens a composer already addressed to this engagement's thread, which
          is why it is a button and not a link to the inbox — the point of a
          shortcut is that it skips the inbox.
        */}
        <Button variant="primary" fullWidth icon={<MessageSquare aria-hidden size={15} />}>
          {t('message')}
        </Button>
        {/* MOCK: opens the book-a-call modal — Batch 3. */}
        <Button variant="secondary" fullWidth>
          {t('bookCall')}
        </Button>
      </div>
    </Card>
  );
}

/* ===========================================================================
 * Documents
 * ======================================================================== */

function DocumentsPanel({
  locale,
  namespace,
  documents,
}: {
  locale: Locale;
  namespace: string;
  documents: SharedDocumentRecord[];
}) {
  const t = useTranslations(`${namespace}.documents`);
  const tDash = useTranslations('dashboard.documents');

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
        <h2 className="font-sans text-title text-gray-700">{t('heading')}</h2>
        <p className="text-caption text-gray-500">{t('caption', { count: documents.length })}</p>
      </div>

      {documents.length === 0 ? (
        <p className="mt-4 text-body text-gray-500">{t('empty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200">
          {documents.map((document) => (
            <li key={document.id} className="flex items-start gap-3 py-3">
              <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-reference font-medium text-gray-600">
                {document.kind.toUpperCase()}
              </span>

              <div className="min-w-0 flex-1">
                {/* <bdi> — a filename is not translated, so this list mixes
                    scripts in both locales and each name must order internally
                    by its own first strong character. <bdi> does that while
                    leaving the BLOCK's alignment to the page, so every name
                    shares one start edge; `dir="auto"` on the block flipped the
                    alignment per row. See DocumentsLibrary.tsx for the
                    measurement. */}
                <p className="text-body text-gray-700 [overflow-wrap:anywhere]">
                  <bdi>{document.name}</bdi>
                </p>
                <p className="text-caption text-gray-500">
                  {tDash('sharedOn', { date: formatCalendarDate(document.sharedOn, locale) })}
                  <span aria-hidden className="mx-1.5">
                    ·
                  </span>
                  {/* Isolated, not forced — "840 كيلوبايت" in Arabic. */}
                  <span className="[unicode-bidi:isolate]">
                    {formatFileSize(document.sizeBytes, locale)}
                  </span>
                </p>
                {document.needsSignature ? (
                  <Badge tone="warning" className="mt-1.5">
                    {tDash('needsSignature')}
                  </Badge>
                ) : null}
              </div>

              {/* Real file streaming from PostgreSQL document store via authenticated proxy */}
              <a
                href={document.downloadUrl || `/api/docs/${document.id}/download`}
                download
                aria-label={t('download', { name: document.name })}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-action transition-colors"
              >
                <Download aria-hidden size={16} strokeWidth={1.8} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ===========================================================================
 * Timeline
 * ======================================================================== */

function TimelinePanel({
  locale,
  namespace,
  timeline,
}: {
  locale: Locale;
  namespace: string;
  timeline: KeyDate[];
}) {
  const t = useTranslations(`${namespace}.timeline`);

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
        <h2 className="font-sans text-title text-gray-700">{t('heading')}</h2>
        <p className="text-caption text-gray-500">{t('caption', { count: timeline.length })}</p>
      </div>

      <div className="mt-4">
        {/* Completed events included — this panel is the record, not a
            look-ahead. */}
        <KeyDatesStrip
          dates={timeline}
          locale={locale}
          layout="grid"
          showKindBadge={false}
          emptyLabel={t('empty')}
        />
      </div>
    </Card>
  );
}

/* ===========================================================================
 * Invoices
 * ======================================================================== */

function InvoicesPanel({
  locale,
  namespace,
  invoices,
}: {
  locale: Locale;
  namespace: string;
  invoices: InvoiceRecord[];
}) {
  const t = useTranslations(`${namespace}.invoices`);

  const outstanding = invoices.filter((invoice) => invoice.status !== 'paid');
  // Summed over this engagement's own invoices only. Small enough to be honest
  // here; the client-wide balance still comes from the API layer, because that
  // one is an aggregate across everything the client owes.
  const balanceDue = outstanding.reduce((total, invoice) => total + invoice.amount, 0);
  const currency = invoices[0]?.currency ?? 'USD';

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-200 pb-3">
        <h2 className="font-sans text-title text-gray-700">{t('heading')}</h2>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-gray-200 bg-gray-100 p-4">
        <div>
          <p className="text-caption text-gray-500">{t('balanceDue')}</p>
          {/* Isolated, not forced LTR: the Arabic form places the ISO code
              after the number and carries its own right-to-left mark. */}
          <p className="mt-0.5 font-mono text-heading font-medium text-gray-900 [unicode-bidi:isolate]">
            {formatMoney(balanceDue, currency, locale)}
          </p>
        </div>

        {outstanding.length > 0 ? (
          // MOCK: the payment flow and its confirmation screen are Batch 3.
          // The one syn-red primary on THIS tab — a different view from the
          // Overview tab, so design.md §4's one-primary-per-view still holds.
          <Button variant="primary" icon={<Receipt aria-hidden size={15} />}>
            {t('pay')}
          </Button>
        ) : (
          <Badge tone="success">{t('settled')}</Badge>
        )}
      </div>

      {invoices.length === 0 ? (
        <p className="mt-4 text-body text-gray-500">{t('empty')}</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200">
          {invoices.map((invoice) => (
            <li
              key={invoice.id}
              className="flex flex-wrap items-baseline justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    dir="ltr"
                    className="font-mono text-reference text-gray-700 [unicode-bidi:isolate]"
                  >
                    {invoice.reference}
                  </span>
                  {/* Tones come from the shared mapping, not from a branch
                      written out here: this tab and the invoices ledger show
                      the same invoices, and an overdue one read amber here and
                      red there until they were unified. See
                      lib/status-tones.ts. */}
                  {invoice.status === 'due' ? (
                    <Badge tone={INVOICE_STATUS_TONE.due}>
                      {t('status.due', {
                        date: formatCalendarDate(invoice.dueOn, locale, { year: false }),
                      })}
                    </Badge>
                  ) : (
                    <Badge tone={INVOICE_STATUS_TONE[invoice.status]}>
                      {t(`status.${invoice.status}`)}
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-caption text-gray-500">{invoice.description[locale]}</p>
                <p className="text-caption text-gray-500">
                  {/* `paidOn` is its own field, never the due date — an invoice
                      is very often paid late, which is what the overdue row
                      above is about. */}
                  {invoice.paidOn
                    ? t('paidOn', { date: formatCalendarDate(invoice.paidOn, locale) })
                    : t('issued', { date: formatCalendarDate(invoice.issuedOn, locale) })}
                </p>
              </div>

              <span className="shrink-0 font-mono text-reference text-gray-900 [unicode-bidi:isolate]">
                {formatMoney(invoice.amount, invoice.currency, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default EngagementDetail;
