import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { EmptyState } from '@/components/ui';
import type { DocumentKind } from '@/fixtures/documents';
import { formatCalendarDate, formatFileSize } from '@/lib/format';
import type { Locale } from '@/lib/i18n/routing';
import {
  DOCUMENT_FILTERS,
  mockApi,
  type DocumentFacets,
  type DocumentFilter,
  type SharedDocumentRecord,
} from '@/lib/mock-api';
import { ClientTopBar } from '../ClientPortalChrome';
import { EngagementFilterNav } from '../EngagementFilterNav';
import { DocumentsLibrary, type DocumentRowData } from './DocumentsLibrary';

/**
 * Documents — every file the firm has shared with this client, in one place.
 *
 * The matter and project detail views each show a slice of this same
 * collection, filtered to one engagement. This screen is the first to show it
 * whole, which is why the API layer's document resolution moved into a shared
 * helper rather than staying inline in `matters.getByReference` — three callers,
 * one shape. See lib/mock-api.ts, `resolveDocuments`.
 *
 * WHAT THE EXPORT BUNDLES THAT IS NOT THIS SCREEN
 * ---------------------------------------------------------------------------
 * The export contains three screens, not one: this library, an "Upload a
 * document" modal, and a full-page "Review & Sign" document viewer.
 * BUILD_PLAN.md §3 puts both of the others in BATCH 3 — "Payment confirmation,
 * e-signature signing flow, … Upload/Book-a-call modals" — so only the library
 * is built here. The two actions that lead to them are present and carry MOCK
 * notes naming where they go.
 *
 * ---------------------------------------------------------------------------
 * NOT CARRIED OVER FROM THE STITCH EXPORT
 * ---------------------------------------------------------------------------
 *  · THE SIMULATED DOCUMENT PAGE in the preview panel — invented recitals, an
 *    invented share count, an invented registration number and a signature
 *    block, rendered under a real filename. See the note in
 *    DocumentsLibrary.tsx for why this one is worse than an invented count.
 *
 *  · EVERY SECURITY AND COMPLIANCE CLAIM AROUND IT: "Client Privileged
 *    (SHA-256)", "SHA-256 VERIFIED", "SynQanun Encrypted Vault", "Tamper-Proof
 *    Digital Seal • SOC 2 Type II", "Audit certificate #AQ-9402 has been
 *    generated and archived", "Sign Document via DocuSign / UAE PASS", and the
 *    Arabic panel's citation of UAE Federal Law No. 46 of 2021 as the basis for
 *    the signature's enforceability. Track A has no vault, no hashing, no
 *    e-signature provider, no audit trail and no authentication. A legal
 *    product asserting a chain of custody it does not have is the most
 *    expensive possible thing to fabricate.
 *
 *  · "Archived (1)" — a fourth status pill matching no row in the export's own
 *    table. There is no archive in the model, so there is no archive filter.
 *
 *  · "All File Types (PDF, DOCX, XLSX, Scans)" over a collection containing no
 *    spreadsheet and no scan, and the Arabic engagement dropdown's four
 *    hardcoded engagements. Both dropdowns are filled from the data now.
 *
 *  · THE TOTAL, STATED THREE TIMES — a toolbar chip ("8 legal documents
 *    available"), a pill ("All (8)") and a footer ("Showing 8 of 8 shared legal
 *    files"), each from its own literal. Stated once, from the count that came
 *    back with the rows.
 *
 *  · THE PAGINATION BAR — Previous/1/Next, both arrows disabled, over eight
 *    rows. The envelope from lib/mock-api.ts pages properly when there is
 *    something to page.
 *
 *  · TRANSLATED FILENAMES. The two exports give the same document different
 *    names per language ("Shareholder_Restructuring_Resolution_v2.1.pdf" /
 *    "قرار_الشركاء_لإعادة_الهيكلة_v2.1.pdf"). A filename belongs to the file, not
 *    to the reader — see the header of fixtures/documents.ts, which settled this
 *    when the collection was created.
 *
 *  · "Adv. R. Al-Khatib" / "المستشار ر. الخطيب" — the gendered honorific, again.
 *  · THE ARABIC-ONLY EXTRAS: a "فرز حسب" sort dropdown, a second table header
 *    bar ("مكتبة المستندات والعقود الرسمية · إجمالي 8 ملفات مسجلة") and a count
 *    chip beside the page title, none of which the English screen has.
 *  · THE PULSING AMBER DOTS, the "متصل" / green online indicator, "v2.4 LTS",
 *    the all-caps column headers, and the whole-row click handler.
 */

/** Rendered per request — every share date resolves against the tenant's clock. */
export const dynamic = 'force-dynamic';

function isDocumentFilter(value: string | undefined): value is DocumentFilter {
  return value !== undefined && (DOCUMENT_FILTERS as string[]).includes(value);
}

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; doc?: string }>;
}) {
  const [{ locale }, { status, doc }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // An unrecognised ?status= falls back to "all" rather than erroring — a
  // filter arrives from a link someone may have edited or kept from an older
  // build, and the right response is to show the library.
  const filter: DocumentFilter = isDocumentFilter(status) ? status : 'all';

  const [result, facets] = await Promise.all([
    mockApi.documents.listShared({ filter }),
    mockApi.documents.facets(),
  ]);

  // An unknown ?doc= is ignored rather than erroring, for the same reason an
  // unknown ?status= is: the link may be old, or the document may since have
  // been withdrawn. The library falls back to its first row.
  const selectedId = result.items.some((document) => document.id === doc) ? doc : undefined;

  return (
    <Documents
      locale={locale as Locale}
      filter={filter}
      counts={result.counts}
      documents={result.items}
      facets={facets}
      selectedId={selectedId}
    />
  );
}

function Documents({
  locale,
  filter,
  counts,
  documents,
  facets,
  selectedId,
}: {
  locale: Locale;
  filter: DocumentFilter;
  counts: Record<DocumentFilter, number>;
  documents: SharedDocumentRecord[];
  facets: DocumentFacets;
  selectedId?: string;
}) {
  const t = useTranslations('documents');

  // Flattened here, where the locale is, so the client component never has to
  // resolve a language. Anything the locale formats — the date, the file size —
  // is formatted here too, through lib/format.ts.
  const rows: DocumentRowData[] = documents.map((document) => ({
    id: document.id,
    name: document.name,
    kind: document.kind,
    sizeLabel: formatFileSize(document.sizeBytes, locale),
    engagementRef: document.engagementRef,
    engagementKind: document.engagementKind,
    engagementTitle: document.engagementTitle[locale],
    engagementHref:
      document.engagementKind === 'matter'
        ? `/matters/${document.engagementRef}`
        : `/projects/${document.engagementRef}`,
    sharedOn: document.sharedOn,
    sharedLabel: formatCalendarDate(document.sharedOn, locale),
    status: document.status,
  }));

  return (
    <>
      <ClientTopBar title={t('title')} subtitle={t('subtitle')} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        {/*
          Nothing shared yet is not the same state as a filter that matched
          nothing, and it is not the state the library was built for — see
          components/ui/EmptyState.tsx. The filter strip and the search box are
          absent rather than disabled: every one of their options leads to
          another empty list, so offering them would be a row of dead ends.
        */}
        {counts.all === 0 ? (
          <EmptyState icon={FileText} title={t('emptyNone')} body={t('emptyNoneBody')} />
        ) : (
          <>
            {/* The same strip the matters and projects lists use — status in the
                URL, counts from the same pass as the rows. */}
            <EngagementFilterNav
              values={DOCUMENT_FILTERS}
              active={filter}
              counts={counts}
              pathname="/documents"
              namespace="documents"
            />

            <DocumentsLibrary
              rows={rows}
              engagementOptions={facets.engagements.map((engagement) => ({
                reference: engagement.reference,
                // Reference and title together: two of these engagements are
                // restructuring work with similar names, and the reference is
                // what a client actually quotes back to the firm.
                label: `${engagement.reference} — ${engagement.title[locale]}`,
              }))}
              kindOptions={facets.kinds as DocumentKind[]}
              initialSelectedId={selectedId}
            />
          </>
        )}
      </main>
    </>
  );
}
