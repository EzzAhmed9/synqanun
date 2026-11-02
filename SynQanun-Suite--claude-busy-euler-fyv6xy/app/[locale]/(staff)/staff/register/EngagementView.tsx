import * as React from 'react';
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  PencilRuler,
  PenLine,
  Receipt,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, buttonClasses, Card } from '@/components/ui';
import { formatCalendarDate, formatFileSize, formatMoney, formatRelativeDays } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import type { StaffEngagementDetail } from '@/lib/mock-api';
import { DOCUMENT_STATUS_TONE, INVOICE_STATUS_TONE } from '@/lib/status-tones';
import { StaffTopBar } from '../../StaffChrome';
import { ReopenMatterButton } from '../matters/ReopenMatterButton';
import { CloseMatterButton } from '../matters/CloseMatterButton';
import { TeamsJoinSlot } from '@/components/meetings/TeamsJoinSlot';
import { CardHead } from '../cards';
import { LogTimeModal } from '../time/LogTimeModal';
import { NewDocumentModal } from './NewDocumentModal';
import { GenerateLegalDocModal } from './GenerateLegalDocModal';
import { ExportExcelModal } from './ExportExcelModal';
import { DocumentPreviewModalButton } from './DocumentPreviewModalButton';
import { MatterTeamCard } from './MatterTeamCard';
import { ApprovalsCard, TasksCard } from '../work-cards';

/**
 * One engagement, from the firm's side. Matters and projects both.
 *
 * ===========================================================================
 * ONE PAGE, NOT FIVE TABS
 * ===========================================================================
 * Both exports put Overview / DMS / Timeline / Billing & WIP / Approvals behind
 * a tab strip. The client's own engagement detail uses tabs too, and for that
 * screen they earn their place: the portal client's files have documents, fee
 * statements and a full procedural history, each worth a view of its own.
 *
 * These do not. Most engagements in the firm's registers have no shared
 * documents and no fee statements at all, so four of five tabs would open on an
 * empty panel — and a tab strip whose counts read (0) is a worse answer than a
 * short section saying nothing has been filed. Everything is on the page, in
 * the order a fee earner opening a file asks for it: what it is, who is on it,
 * what happens next, what is waiting on someone.
 *
 * ===========================================================================
 * THE THREE FIELDS THAT ARE CALLED DIFFERENT THINGS
 * ===========================================================================
 * `venue`, `registryNumber` and `counterpart` are one shape with two
 * vocabularies — a matter has a forum, a court file number and an opponent; a
 * project has a jurisdiction, a registration number and a target. The data is
 * identical, so the component is one and the `namespace` supplies the words.
 * See `StaffEngagementRow` in lib/mock-api.ts.
 *
 * Since the client's October 2026 amendments there is one register, so a
 * former project is a legal matter of the kind `otherProject` and opens at
 * /staff/matters/PRJ-…. It still takes `staffProjects` for those three fields
 * (the caller picks by `engagement.kind`): a commercial registration is not a
 * court file, and a transaction's target is not an opponent. The way back and
 * the kind-of-work badge are the register's own words whatever the kind.
 */
function getDocumentTimeDisplay(document: any, locale: string): string | null {
  // 1. If backend gave timeFormatted
  if (document.timeFormatted) {
    return document.timeFormatted;
  }

  // 2. If createdAt or updatedAt is present
  const rawDate = document.createdAt || document.updatedAt;
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      }
    } catch {
      // fallback
    }
  }

  // 3. Fallback: Parse from filename timestamp e.g. _20261102_132645.docx
  if (typeof document.name === 'string') {
    const match = document.name.match(/_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
    if (match) {
      const h = parseInt(match[4], 10);
      const m = match[5];
      const s = match[6];
      if (locale === 'ar') {
        const period = h >= 12 ? 'م' : 'ص';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${String(h12).padStart(2, '0')}:${m}:${s} ${period}`;
      } else {
        const period = h >= 12 ? 'PM' : 'AM';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${String(h12).padStart(2, '0')}:${m}:${s} ${period}`;
      }
    }
  }

  return null;
}

export function EngagementView({
  locale,
  namespace,
  basePath,
  record,
  canReopen,
  time,
}: {
  locale: Locale;
  namespace: 'staffMatters' | 'staffProjects';
  basePath: '/staff/matters';
  record: StaffEngagementDetail;
  /** A partner may reopen a closed file from here as well as from the Archive. */
  canReopen: boolean;
  /**
   * What the viewer needs to log time here, or `null` for a rank that does not
   * record any.
   *
   * Passed in rather than fetched, because this component is shared by the
   * matter and project routes and both already resolve the session. `null`
   * rather than a boolean flag: a rank that cannot log time has no use for the
   * file list or the tenant's today either, so the absent case carries no
   * payload at all.
   */
  time: { engagements: { value: string; label: string }[]; today: string; weeksShown: number } | null;
}) {
  const t = useTranslations(namespace);
  const tRegister = useTranslations('staffMatters');
  const tRole = useTranslations('staffDashboard.engagements.role');
  // The firm's word for a rank, and the reader's word for a document or an
  // invoice status — read from the namespaces that already own that vocabulary
  // rather than restated under this screen's own keys.
  const tRank = useTranslations('ranks');
  const tDocStatus = useTranslations('documents.status');
  // The picker owns the document-type vocabulary; this card reads it rather
  // than restating seven labels that would be free to drift from the cards
  // that create them.
  const tDocType = useTranslations('newDocument.types');
  const tInvoiceStatus = useTranslations('invoices.status');

  const {
    engagement,
    client,
    timeline,
    documents,
    firmDocuments,
    signatureRequests,
    invoices,
    approvals,
    tasks,
  } = record;

  // Which shared documents already have a request prepared against them. Built
  // once rather than scanned per row.
  const preparedFor = new Map(signatureRequests.map((request) => [request.documentId, request]));

  const facts: { label: string; value: React.ReactNode }[] = [
    {
      label: t('columns.client'),
      value: (
        <Link href={`/staff/clients/${client.id}`} className="text-legal-navy hover:underline">
          <bdi>{client.name[locale]}</bdi>
        </Link>
      ),
    },
    { label: t('columns.venue'), value: <bdi>{engagement.venue[locale]}</bdi> },
    { label: t('detail.category'), value: <bdi>{engagement.category[locale]}</bdi> },
    {
      label: t('detail.registry'),
      value: engagement.registryNumber ? (
        // Latin in every locale — lib/format.ts.
        <span dir="ltr" className="font-mono text-reference">
          {engagement.registryNumber}
        </span>
      ) : (
        <span className="text-gray-500">{t('detail.noRegistry')}</span>
      ),
    },
    {
      label: t('detail.instructed'),
      value: (
        <span className="[unicode-bidi:isolate]">
          {formatCalendarDate(record.openedOn, locale, { month: 'long' })}
        </span>
      ),
    },
    {
      label: t('columns.updated'),
      value: (
        <span className="[unicode-bidi:isolate]">
          {formatRelativeDays(engagement.lastUpdatedOn, locale)}
        </span>
      ),
    },
    { label: t('detail.phase'), value: <bdi>{record.currentPhase[locale]}</bdi> },
    {
      label: t('detail.counterpart'),
      value: record.counterpart ? (
        <bdi>{record.counterpart[locale]}</bdi>
      ) : (
        // Non-contentious work has no opponent, and a project may name no
        // target yet. Saying so beats an empty cell.
        <span className="text-gray-500">{t('detail.noCounterpart')}</span>
      ),
    },
  ];

  return (
    <>
      <StaffTopBar title={engagement.title[locale]} subtitle={client.name[locale]} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-6 px-6 py-6 [&>*]:shrink-0">
        <Link
          href={basePath}
          className="inline-flex w-fit items-center gap-1.5 text-caption text-legal-navy hover:underline"
        >
          {/* A direction, so it mirrors. design.md §12. */}
          <ArrowLeft aria-hidden size={14} className="rtl:rotate-180" />
          {tRegister('detail.back')}
        </Link>

        {/* What it is -------------------------------------------------- */}
        <Card padding="lg">
          <div className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-mono text-reference text-legal-navy">
              {engagement.reference}
            </span>
            <Badge tone="neutral" icon={null}>
              {tRegister(`types.${engagement.workType}`)}
            </Badge>
            <Badge tone={engagement.statusTone} icon={null}>
              {engagement.status[locale]}
            </Badge>
            {engagement.active ? null : (
              <>
                <Badge tone="neutral" icon={null}>
                  {t('closed')}
                </Badge>
                {/* Where it is kept now: the register's Archive. */}
                <Badge tone="neutral" icon={null}>
                  {tRegister('archive.archived')}
                </Badge>
              </>
            )}
            {engagement.reopenedThisSession ? (
              <span className="text-caption text-gray-600">{tRegister('reopen.thisSession')}</span>
            ) : null}
            {engagement.active && engagement.needsAttention ? (
              <Badge tone="warning">{t('waitingOnClient')}</Badge>
            ) : null}
          </div>

          <h2 className="mt-2 text-title text-gray-700">
            <bdi>{engagement.title[locale]}</bdi>
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!engagement.active && canReopen ? (
              <ReopenMatterButton reference={engagement.reference} />
            ) : engagement.active && canReopen ? (
              <CloseMatterButton reference={engagement.reference} />
            ) : null}
            <a
              href={`/${locale}/staff/documents/draft?matter=${engagement.reference}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 shadow-xs hover:bg-blue-100 transition-colors"
            >
              <FileText size={15} className="text-blue-600" />
              صياغة مستند Word في تبويب جديد (.docx)
            </a>
            <ExportExcelModal
              engagementRef={engagement.reference}
              clientId={record.client?.id}
              clientName={record.client?.name?.[locale]}
            />
          </div>

          {/* WHAT the client owes, not just that they owe something — the same
              reason fixtures/matters.ts carries `attentionReason` at all. */}
          {engagement.active && engagement.needsAttention && record.attentionReason ? (
            <p className="mt-2 text-body text-gray-600">
              <bdi>{record.attentionReason[locale]}</bdi>
            </p>
          ) : null}

          <p className="mt-3 border-t border-gray-200 pt-3 text-body text-gray-700">
            <bdi>{record.scopeSummary[locale]}</bdi>
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-200 pt-4 tablet:grid-cols-2 desktop:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-caption text-gray-500">{fact.label}</dt>
                <dd className="mt-0.5 text-body text-gray-700">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Who is on it ------------------------------------------------- */}
        <MatterTeamCard
          matterRef={engagement.reference}
          team={engagement.team}
          locale={locale}
        />

        {/* What happens next -------------------------------------------- */}
        <Card padding="none" className="overflow-hidden">
          <header className="border-b border-gray-200 p-5">
            <CardHead
              icon={CalendarClock}
              heading={t('detail.record')}
              caption={t('detail.recordCount', { count: timeline.length })}
            />
          </header>
          {timeline.length === 0 ? (
            <p className="p-5 text-body text-gray-500">{t('detail.noRecord')}</p>
          ) : (
            <ol className="divide-y divide-gray-200">
              {timeline.map((event) => (
                <li key={event.id} className="flex items-start gap-3 p-4">
                  <span
                    aria-hidden
                    className={
                      event.completed
                        ? 'mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-gray-300'
                        : 'mt-1.5 h-2 w-2 shrink-0 rounded-pill bg-legal-navy'
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span
                        className={
                          event.completed
                            ? 'text-body text-gray-500'
                            : 'text-body-emphasis text-gray-700'
                        }
                      >
                        <bdi>{event.title[locale]}</bdi>
                      </span>
                      <span className="text-caption text-gray-500 [unicode-bidi:isolate]">
                        {formatCalendarDate(event.date, locale, { month: 'short' })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-caption text-gray-500">
                      <bdi>{event.detail[locale]}</bdi>
                    </p>
                    {event.note ? (
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-caption text-gray-500">
                        {event.awaitingClient ? (
                          <Badge tone="warning">{t('waitingOnClient')}</Badge>
                        ) : null}
                        <bdi>{event.note[locale]}</bdi>
                      </p>
                    ) : null}
                    {/* A meeting still ahead gets the Teams slot — a labelled
                        placeholder, see components/meetings/TeamsJoinSlot. */}
                    {!event.completed && event.eventKind === 'conference' ? (
                      <TeamsJoinSlot meetingTitle={event.title[locale]} className="mt-2" />
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* What is waiting on someone ------------------------------------ */}
        {approvals.length > 0 ? (
          <ApprovalsCard approvals={approvals} locale={locale} heading={t('detail.approvals')} />
        ) : null}

        {tasks.length > 0 ? (
          <TasksCard tasks={tasks} locale={locale} heading={t('detail.tasks')} showAssignee />
        ) : null}

        {/* What the firm is writing -------------------------------------- */}
        {/*
          ABOVE the shared card and separate from it, because the two answer
          different questions and a reader who conflates them will think the
          client has seen a draft. fixtures/documents.ts holds the two
          collections apart for the same reason; this is that boundary made
          visible.
        */}
        <Card padding="none" className="overflow-hidden">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 p-5">
            <CardHead
              icon={PencilRuler}
              heading={t('detail.firmDocuments')}
              caption={t('detail.firmDocumentsCount', { count: firmDocuments.length })}
            />
            <span className="flex flex-wrap items-center gap-2">
              {/*
                Gated by `RANKS_THAT_BILL`, unlike the document button beside
                it — absent for a legal secretary, never disabled. The two
                controls sit together and answer to different rules, which is
                the honest arrangement rather than a tidy one.
              */}
              {time ? (
                <LogTimeModal
                  engagements={time.engagements}
                  defaultEngagementRef={engagement.reference}
                  today={time.today}
                  weeksShown={time.weeksShown}
                />
              ) : null}
              {/* Module 5: Word & Excel Generation & Exports */}
              <GenerateLegalDocModal
                engagementRef={engagement.reference}
                engagementTitle={engagement.title[locale]}
                clientName={record.client?.name?.[locale]}
                opposingParty={record.counterpart?.[locale]}
                venue={engagement.venue?.[locale]}
                caseNumber={engagement.registryNumber || undefined}
              />
              <ExportExcelModal
                engagementRef={engagement.reference}
                clientId={record.client?.id}
                clientName={record.client?.name?.[locale]}
              />
              <NewDocumentModal
                engagementRef={engagement.reference}
                engagementTitle={engagement.title[locale]}
              />
            </span>
          </header>
          {firmDocuments.length === 0 ? (
            <p className="p-5 text-body text-gray-500">{t('detail.noFirmDocuments')}</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {firmDocuments.map((document) => (
                <li
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <span className="min-w-0 flex-1">
                    {/* A title belongs to the document, not to the reader */}
                    <span className="block text-body font-medium text-gray-800 [unicode-bidi:isolate]">
                      <bdi>{document.title}</bdi>
                    </span>
                    <span className="mt-0.5 block text-caption text-gray-500 [unicode-bidi:isolate]">
                      {tDocType(`${document.type}.label`)}
                      {' · '}
                      {formatRelativeDays(document.createdOn, locale)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {/* Direct download button for stored files */}
                    <a
                      href={(document as any).downloadUrl || `http://127.0.0.1:8000/api/documents/${document.id}/download`}
                      download
                      title="تحميل الملف"
                      className="inline-flex h-8 items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-action transition-colors"
                    >
                      <Download size={14} />
                      <span>تحميل</span>
                    </a>
                    {document.addedThisSession ? (
                      <Badge tone="neutral" icon={null}>
                        {t('detail.thisSession')}
                      </Badge>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* What the client has been sent (Shared Documents) ----------------- */}
        <Card padding="none" className="overflow-hidden">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 p-5">
            <CardHead
              icon={FileText}
              heading={t('detail.documents')}
              caption={t('detail.documentsCount', { count: documents.length })}
            />
            <span className="flex flex-wrap items-center gap-2">
              <a
                href={`/${locale}/staff/documents/draft?matter=${engagement.reference}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 shadow-xs hover:bg-blue-100 transition-colors"
              >
                <FileText size={15} className="text-blue-600" />
                صياغة مستند Word في تبويب جديد (.docx)
              </a>
              <ExportExcelModal
                engagementRef={engagement.reference}
                clientId={record.client?.id}
                clientName={record.client?.name?.[locale]}
              />
              {documents.length > 0 ? (
                <Link
                  href="/staff/signatures/new"
                  className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                >
                  <PenLine aria-hidden size={15} className="me-1.5" />
                  {t('detail.requestSignature')}
                </Link>
              ) : null}
            </span>
          </header>
          {documents.length === 0 ? (
            <p className="p-5 text-body text-gray-500">{t('detail.noDocuments')}</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {documents.map((document, idx) => {
                const timeStr = getDocumentTimeDisplay(document, locale);
                const isLatest = idx === 0 && document.kind === 'docx';

                return (
                  <li
                    key={document.id}
                    className={`flex flex-wrap items-center justify-between gap-3 p-4 transition-colors ${
                      isLatest ? 'bg-blue-50/25' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                          document.kind === 'docx'
                            ? 'bg-blue-100 text-blue-800'
                            : document.kind === 'xlsx'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {document.kind.toUpperCase()}
                        </span>
                        <span className="block text-body font-medium text-gray-800 [unicode-bidi:isolate]">
                          <bdi>{document.name}</bdi>
                        </span>
                        {timeStr && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900 border border-amber-200">
                            <Clock size={11} className="text-amber-700" />
                            <span>{timeStr}</span>
                          </span>
                        )}
                        {isLatest && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                            🌟 أحدث نسخة
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-caption text-gray-500 [unicode-bidi:isolate]">
                        <span>{formatFileSize(document.sizeBytes, locale)}</span>
                        <span>·</span>
                        <span>{formatRelativeDays(document.sharedOn, locale)}</span>
                        {timeStr && (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-gray-700 inline-flex items-center gap-1">
                              <Clock size={12} className="text-gray-400" />
                              الساعة {timeStr}
                            </span>
                          </>
                        )}
                      </span>
                    </span>
                  <span className="flex items-center gap-2">
                    <DocumentPreviewModalButton
                      documentId={document.id}
                      documentName={document.name}
                      matterRef={engagement.reference}
                      timeFormatted={timeStr}
                      locale={locale}
                    />
                    {document.kind === 'docx' && (
                      <a
                        href={`/${locale}/staff/documents/draft?matter=${engagement.reference}&doc_id=${document.id}&auto_open=word`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="متابعة التعديل على هذا المستند في Microsoft Word Online"
                        className="inline-flex h-8 items-center gap-1.5 rounded border border-[#0078D4] bg-blue-50/70 px-2.5 text-xs font-bold text-[#0078D4] shadow-xs hover:bg-blue-100 transition-colors"
                      >
                        <FileText size={13} className="text-[#0078D4]" />
                        <span>✏️ متابعة التعديل في Word</span>
                      </a>
                    )}
                    <a
                      href={(document as any).downloadUrl || `http://127.0.0.1:8000/api/documents/${document.id}/download`}
                      download
                      title="تحميل الملف"
                      className="inline-flex h-8 items-center gap-1.5 rounded border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:text-action transition-colors"
                    >
                      <Download size={14} />
                      <span>تحميل</span>
                    </a>
                    <Badge tone={DOCUMENT_STATUS_TONE[document.status]} icon={null}>
                      {tDocStatus(document.status)}
                    </Badge>
                    {preparedFor.has(document.id) ? (
                      <span className="text-caption text-gray-500">
                        {t('detail.signaturePrepared', {
                          count: preparedFor.get(document.id)!.signers.length,
                        })}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
            </ul>
          )}
        </Card>

        {/* What has been billed ------------------------------------------ */}
        <Card padding="none" className="overflow-hidden">
          <header className="border-b border-gray-200 p-5">
            <CardHead
              icon={Receipt}
              heading={t('detail.invoices')}
              caption={t('detail.invoicesCount', { count: invoices.length })}
            />
          </header>
          {invoices.length === 0 ? (
            <p className="p-5 text-body text-gray-500">{t('detail.noInvoices')}</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <span className="min-w-0 flex-1">
                    <span dir="ltr" className="block font-mono text-reference text-gray-700">
                      {invoice.reference}
                    </span>
                    <span className="mt-0.5 block text-caption text-gray-500">
                      <bdi>{invoice.description[locale]}</bdi>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-reference text-gray-700 [unicode-bidi:isolate]">
                      {formatMoney(invoice.amount, invoice.currency, locale)}
                    </span>
                    <Badge tone={INVOICE_STATUS_TONE[invoice.status]} icon={null}>
                      {tInvoiceStatus(invoice.status)}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
