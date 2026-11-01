import { FileText, History, Lightbulb, Repeat2, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Badge, Card, EmptyState, tabTriggerClasses } from '@/components/ui';
import { formatCalendarDate, formatFileSize, formatRelativeDays } from '@/lib/format';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import { mockApi, type DocumentContext } from '@/lib/mock-api';
import { cn } from '@/lib/utils';
import { StaffTopBar } from '../../../StaffChrome';
import { CardHead } from '../../cards';
import { AIDemoNotice } from '../AIDemoNotice';
import { OcrCanvas } from './OcrCanvas';
import { OcrImportButton } from './OcrImport';

/**
 * Document Canvas — BUILD_PLAN.md §3, Batch 5.
 *
 * ===========================================================================
 * THE BODY IS A PLACEHOLDER, BECAUSE THERE IS NO BODY
 * ===========================================================================
 * fixtures/documents.ts holds a filename, a size, a status and an engagement.
 * It has never held document TEXT, and that is exactly why the Approvals
 * export's clause diff was refused: "Section 4.2 · Page 14 of 42", a redline
 * with "+12 words inserted / -4 words repealed", and two locales showing
 * entirely different clause text for the same document.
 *
 * Writing a plausible indemnity clause here to mark up would be committing
 * that same fabrication one screen later, and a convincing one — invented
 * contract language in a legal product reads as a precedent the firm uses. So
 * the drafting surface holds visibly numbered placeholder blocks, and says in
 * words that the content is not real. What IS real is everything around it:
 * the document, its status, its engagement, its client, and the counts the
 * suggestions reason over.
 *
 * ===========================================================================
 * STRUCTURAL SUGGESTIONS ONLY
 * ===========================================================================
 * A missing governing-law clause, a definition repeated from an earlier
 * section, a cap that does not match the others on the file. Every one is a
 * drafting-quality observation a careful reader could make and verify.
 *
 * None of them says what the law requires, whether a term is enforceable, or
 * what a court would do. That line is the difference between a tool that helps
 * a lawyer draft and one that practises law — and every AI panel in these
 * Stitch exports crossed it: "No unauthorized waiver of director liability
 * detected", "Consortium's emergency injunction motion faces procedural
 * vulnerability", "الصفقة لا تتجاوز الحدود الاحتكارية الموجبة للحظر".
 *
 * The two comparison counts in the suggestions are read from the documents
 * collection, so a suggestion cannot claim a comparison set that does not
 * exist. Nothing here carries a confidence score — see AIDemoNotice.tsx.
 *
 * No Stitch export was supplied for this screen. The Assistant and AI Reports
 * exports arrived later and carry their own catalogues; see those files.
 */

export const dynamic = 'force-dynamic';

export default async function DocumentCanvasPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ doc?: string; source?: string; id?: string; import?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // OCR mode: a scan converted in this browser. The server renders only the
  // frame; the document itself is read from the browser's own storage by id.
  if (query.source === 'ocr' && query.id) {
    return <OcrMode id={query.id} />;
  }

  const drafts = await mockApi.staff.draftDocuments();
  // An edited ?doc= falls back to the first draft rather than erroring, and
  // the picker only ever offers documents that exist.
  const chosenId = drafts.find((row) => row.id === query.doc)?.id ?? drafts[0]?.id ?? null;
  const context = chosenId ? await mockApi.staff.documentContext(chosenId) : null;

  return (
    <Canvas
      locale={locale as Locale}
      drafts={drafts.map((row) => ({ id: row.id, name: row.name }))}
      context={context}
      importOpen={query.import === 'ocr'}
    />
  );
}

/** The canvas frame around a converted scan. See ./OcrCanvas.tsx. */
function OcrMode({ id }: { id: string }) {
  const t = useTranslations('ai.canvas');
  return (
    <>
      <StaffTopBar title={t('title')} subtitle={t('ocr.subtitle')} />
      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6 max-tablet:px-4">
        <OcrCanvas id={id} />
      </main>
    </>
  );
}

function Canvas({
  locale,
  drafts,
  context,
  importOpen,
}: {
  locale: Locale;
  drafts: { id: string; name: string }[];
  context: DocumentContext | null;
  /** `?import=ocr`: open the scan dialog on arrival. */
  importOpen: boolean;
}) {
  const t = useTranslations('ai.canvas');
  // The firm's word for a rank, read from the namespace that owns it.
  const tRank = useTranslations('ranks');

  if (!context) {
    return (
      <>
        <StaffTopBar title={t('title')} subtitle={t('subtitle')} />
        <main className="mx-auto flex w-full max-w-content flex-1 flex-col px-6 py-6">
          <EmptyState
            icon={FileText}
            title={t('empty.title')}
            body={t('empty.body')}
            action={<OcrImportButton autoOpen={importOpen} />}
          />
        </main>
      </>
    );
  }

  const doc = context.document;

  /*
    Three suggestions, each structural and each anchored to a placeholder
    block. The two that compare against other documents take their counts from
    `documentContext` — a suggestion that says "your other agreements" has to
    know how many there are, or it is guessing about the firm's own files.
  */
  const suggestions = [
    {
      id: 'governingLaw',
      icon: ScrollText,
      section: t('sections.4'),
      body: t('suggestions.governingLaw', {
        client: context.clientName[locale],
        count: context.forClient,
      }),
    },
    {
      id: 'repeatedDefinition',
      icon: Repeat2,
      section: t('sections.5'),
      body: t('suggestions.repeatedDefinition', { section: t('sections.2') }),
    },
    {
      id: 'capMismatch',
      icon: Lightbulb,
      section: t('sections.6'),
      body: t('suggestions.capMismatch', { count: Math.max(context.onEngagement - 1, 0) }),
    },
  ];

  return (
    <>
      <StaffTopBar title={t('title')} subtitle={doc.name} />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col gap-5 px-6 py-6">
        <AIDemoNotice />

        {/*
          UPLOAD A SCAN. The canvas's one way in for a document that exists only
          on paper: convert it to editable text, in the browser. It opens in
          this same screen, in OCR mode. See ./OcrImport.tsx.
        */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-caption text-gray-600">{t('ocr.entry')}</p>
          <OcrImportButton autoOpen={importOpen} />
        </div>

        {/* Only drafts, because a final order is not a thing you redraft. */}
        <nav aria-label={t('picker')} className="flex flex-wrap gap-1">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={{ pathname: '/staff/ai/canvas', query: { doc: draft.id } }}
              aria-current={draft.id === doc.id ? 'page' : undefined}
              className={cn(tabTriggerClasses(draft.id === doc.id), 'whitespace-nowrap')}
            >
              {/* A filename belongs to the file, not to the reader. */}
              <span className="[unicode-bidi:isolate]">
                <bdi>{draft.name}</bdi>
              </span>
            </Link>
          ))}
        </nav>

        {/* What this document actually is ------------------------------- */}
        <Card padding="lg">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral" icon={null}>
              {t(`status.${doc.status}`)}
            </Badge>
            <Link
              href={`/staff/matters/${context.engagementRef}`}
              className="hover:underline"
            >
              <span dir="ltr" className="font-mono text-reference text-legal-navy">
                {context.engagementRef}
              </span>
            </Link>
            <Link
              href={`/staff/clients/${context.clientId}`}
              className="text-caption text-legal-navy hover:underline"
            >
              <bdi>{context.clientName[locale]}</bdi>
            </Link>
          </div>
          <p className="mt-2 text-caption text-gray-500 [unicode-bidi:isolate]">
            {formatFileSize(doc.sizeBytes, locale)}
            {' · '}
            {formatRelativeDays(doc.sharedOn, locale)}
          </p>
        </Card>

        <div className="grid grid-cols-1 gap-5 desktop:grid-cols-[1fr_20rem]">
          {/* The drafting surface ---------------------------------------- */}
          <Card padding="none" className="overflow-hidden">
            <header className="border-b border-gray-200 p-5">
              <CardHead icon={FileText} heading={t('draft')} caption={t('placeholderCaption')} />
            </header>

            <div className="flex flex-col gap-4 p-5">
              {/*
                Numbered blocks with no text in them. A reader can see at a
                glance that the content is absent rather than unreadable, which
                is the opposite of what invented clause language would do.
              */}
              {(['2', '4', '5', '6'] as const).map((section) => (
                <section key={section} className="rounded-card border border-dashed border-gray-300 bg-gray-50 p-4">
                  <h3 className="text-caption font-medium text-gray-500">
                    {t('sections.' + section)}
                  </h3>
                  <p className="mt-2 text-body text-gray-500">{t('placeholderBody')}</p>
                </section>
              ))}
            </div>

            <p className="border-t border-gray-200 p-4 text-caption text-gray-500">
              {t('noBody')}
            </p>
          </Card>

          {/*
            The narrow column holds both panels. Without the wrapper the history
            card became a third GRID item and wrapped under the document in the
            wide column, which is a reasonable place for it and not the one the
            comment below claims.
          */}
          <div className="flex h-fit flex-col gap-5">
            {/* The suggestions ------------------------------------------- */}
            <Card padding="none" className="overflow-hidden">
            <header className="border-b border-gray-200 p-5">
              <CardHead
                icon={Lightbulb}
                heading={t('suggestionsHeading')}
                caption={t('suggestionsCaption')}
              />
            </header>
            <ul className="divide-y divide-gray-200">
              {suggestions.map((suggestion) => (
                <li key={suggestion.id} className="flex items-start gap-3 p-4">
                  <suggestion.icon
                    aria-hidden
                    size={15}
                    className="mt-0.5 shrink-0 text-legal-navy"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-caption text-gray-500">{suggestion.section}</p>
                    <p className="mt-0.5 text-body text-gray-700">
                      <bdi>{suggestion.body}</bdi>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {/*
              No Accept / Dismiss. Acting on a suggestion edits a document, and
              writes are Batch 6 — the same call the approvals queue makes
              about its missing decision buttons.
            */}
            <p className="border-t border-gray-200 p-4 text-caption text-gray-500">
              {t('noActions')}
            </p>
          </Card>

          {/* Version history ---------------------------------------------- */}
          {/*
            UNDER THE SUGGESTIONS, IN THE SAME COLUMN, rather than as a docked
            rail of its own. The export gives it a 420px drawer that pushes the
            document aside, which is the right shape when the panel carries a
            diff to read. This one carries three facts per row, and a drawer
            that wide for a date and a name would be furniture.

            It sits on the CANVAS because the canvas is where a document is
            worked on, and it reads the same `documentContext` the rest of this
            screen does — so the history and the document cannot end up
            describing different files.
          */}
          <Card padding="none" className="h-fit overflow-hidden">
            <header className="border-b border-gray-200 p-5">
              <CardHead
                icon={History}
                heading={t('versions.heading')}
                // Counted off the list below, never stated.
                caption={t('versions.count', { count: context.versions.length })}
              />
            </header>

            <ol className="divide-y divide-gray-200">
              {context.versions.map((version) => (
                <li key={version.label} className="flex items-start gap-3 p-4">
                  {/* A counter, not semantic versioning — see the fixture. */}
                  <span
                    dir="ltr"
                    className="mt-0.5 shrink-0 rounded-btn bg-gray-100 px-2 py-0.5 font-mono text-reference text-gray-600"
                  >
                    {version.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-gray-700">
                      <bdi>{version.byName[locale]}</bdi>
                    </p>
                    <p className="mt-0.5 text-caption text-gray-500">
                      {/* The rank as a CATEGORY label — lib/ranks.ts. */}
                      {tRank(`holder.${version.byRank}`)}
                    </p>
                    <p className="mt-1 text-caption text-gray-500 [unicode-bidi:isolate]">
                      {formatCalendarDate(version.savedOn, locale, { month: 'short' })}
                    </p>
                  </div>
                  {version.isCurrent ? (
                    <Badge tone="neutral" icon={null}>
                      {t('versions.current')}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ol>

            {/*
              The disclaimer that moved here from lib/mock-api.ts, where it used
              to read "there is no document body, no version history and no
              redline". The history exists now; the rest of that sentence is why
              this list is a list of dates and names and nothing else.
            */}
            <p className="border-t border-gray-200 p-4 text-caption text-gray-500">
              {t('versions.noDiff')}
            </p>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
