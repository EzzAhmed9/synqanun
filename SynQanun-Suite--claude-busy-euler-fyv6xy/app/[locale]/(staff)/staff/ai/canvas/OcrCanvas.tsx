'use client';

import * as React from 'react';
import { Download, FileText, Lock, ScanText, Trash2, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { useRouter } from '@/lib/i18n/navigation';
import { buildDocx, docxFileName } from '@/lib/ocr/docx';
import { deleteOcrDocument, loadOcrDocument, saveOcrDocument } from '@/lib/ocr/store';
import {
  LOW_CONFIDENCE,
  lineDirection,
  lineText,
  type OcrDocument,
  type OcrPage,
} from '@/lib/ocr/types';
import { microsoftWord } from '@/lib/ocr/word-integration';
import { CardHead } from '../../cards';
import { OcrImportButton } from './OcrImport';

/**
 * Document Canvas, OCR mode: a converted scan, editable, beside its original.
 *
 * ===========================================================================
 * IT ALL STAYS IN THIS BROWSER
 * ===========================================================================
 * The document is read from IndexedDB by the id in the URL (lib/ocr/store.ts)
 * and edits are saved back there. The server renders this screen's frame and
 * never sees the file, the page images or the text. The .docx is built here
 * and downloaded. The one action that WOULD send it somewhere — opening it in
 * Microsoft Word — is an unbuilt slot, see lib/ocr/word-integration.ts.
 *
 * ===========================================================================
 * EDITING
 * ===========================================================================
 * One editable block per page, one paragraph per scanned line, each with its
 * own direction (`dir`), so Arabic lines run right to left and English lines
 * left to right inside the same page — the mixed letterhead case. Words the
 * reader was unsure of (confidence under LOW_CONFIDENCE) are highlighted with
 * a tint AND a dotted underline, never colour alone, with the confidence in a
 * tooltip; the count per page is stated in words. An edited line loses its
 * highlights — the reader has checked it — and its direction is decided again
 * from what they typed.
 *
 * The blocks are uncontrolled: React writes them once and the browser owns
 * them after that, because re-rendering a contentEditable on every keystroke
 * throws the caret to the start. Edits are read back from the DOM, debounced,
 * and saved.
 */
export function OcrCanvas({ id }: { id: string }) {
  const t = useTranslations('ai.canvas.ocr');
  const router = useRouter();
  const [doc, setDoc] = React.useState<OcrDocument | null | undefined>(undefined);
  const [saved, setSaved] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  const [exporting, setExporting] = React.useState(false);
  const [wordNote, setWordNote] = React.useState(false);
  const docRef = React.useRef<OcrDocument | null>(null);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    let live = true;
    loadOcrDocument(id)
      .then((found) => {
        if (!live) return;
        docRef.current = found ?? null;
        setDoc(found ?? null);
      })
      .catch(() => live && setDoc(null));
    return () => {
      live = false;
    };
  }, [id]);

  const onEdit = React.useCallback((pageNumber: number, lines: string[]) => {
    const current = docRef.current;
    if (!current) return;
    docRef.current = {
      ...current,
      pages: current.pages.map((page) => (page.number === pageNumber ? { ...page, edited: lines } : page)),
    };
    setSaved('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (docRef.current) void saveOcrDocument(docRef.current).then(() => setSaved('saved'));
    }, 600);
  }, []);

  const exportDocx = async () => {
    if (!docRef.current) return;
    setExporting(true);
    try {
      const blob = await buildDocx(docRef.current);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = docxFileName(docRef.current.name);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setExporting(false);
    }
  };

  const discard = async () => {
    await deleteOcrDocument(id);
    router.push('/staff/ai/canvas');
  };

  if (doc === undefined) {
    return <p className="text-body text-gray-600">{t('loading')}</p>;
  }
  if (doc === null) {
    return (
      <EmptyState
        icon={ScanText}
        title={t('missing.title')}
        body={t('missing.body')}
        action={<OcrImportButton />}
      />
    );
  }

  const words = doc.pages.flatMap((page) => page.lines.flatMap((line) => line.words));
  const low = words.filter((word) => word.confidence < LOW_CONFIDENCE).length;
  const mean = words.length
    ? Math.round(words.reduce((sum, word) => sum + word.confidence, 0) / words.length)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* What this is, and the two promises. -------------------------------- */}
      <Card padding="lg">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" icon={<Lock aria-hidden size={12} />}>
            {t('badges.local')}
          </Badge>
          <Badge tone="warning">{t('badges.check')}</Badge>
        </div>
        <h2 className="mt-2 text-title text-gray-700">
          <bdi>{doc.name}</bdi>
        </h2>
        <p className="mt-1 text-caption text-gray-600 [unicode-bidi:isolate]">
          {t('summary', { pages: doc.pages.length, words: words.length, low, mean })}
        </p>
        <p className="mt-3 flex items-start gap-2 text-caption text-gray-700">
          <Lock aria-hidden size={14} className="mt-0.5 shrink-0 text-gray-600" />
          {t('privacy')}
        </p>
        <p className="mt-1 flex items-start gap-2 text-caption text-gray-700">
          <TriangleAlert aria-hidden size={14} className="mt-0.5 shrink-0 text-warning-text" />
          {t('limits')}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
          <Button
            variant="primary"
            loading={exporting}
            onClick={exportDocx}
            icon={<Download aria-hidden size={15} />}
          >
            {t('export')}
          </Button>

          {/*
            THE MICROSOFT WORD / GRAPH SLOT. Not built: `microsoftWord` is null
            (lib/ocr/word-integration.ts). Drawn as a labelled placeholder so
            the place exists and nobody mistakes it for a feature.
          */}
          <div
            data-slot="microsoft-word-graph"
            className="flex flex-wrap items-center gap-2 rounded-card border border-dashed border-gray-300 px-3 py-1.5"
          >
            <Button
              variant="secondary"
              size="sm"
              icon={<FileText aria-hidden size={14} />}
              aria-expanded={wordNote}
              onClick={() => setWordNote(true)}
            >
              {t('word.action')}
            </Button>
            <span className="text-caption text-gray-600">
              {microsoftWord ? null : t('word.slot')}
            </span>
          </div>

          <OcrImportButton />

          <Button
            variant="destructive"
            size="sm"
            onClick={discard}
            icon={<Trash2 aria-hidden size={14} />}
          >
            {t('discard')}
          </Button>
        </div>
        <p aria-live="polite" className={wordNote ? 'mt-2 text-caption text-gray-600' : 'sr-only'}>
          {wordNote ? t('word.note') : ''}
        </p>
      </Card>

      {/* The key to the highlights, in words. */}
      <p className="flex flex-wrap items-center gap-2 text-caption text-gray-700">
        <mark className="rounded-sm bg-warning/20 px-1 text-gray-900 underline decoration-warning-text decoration-dotted underline-offset-4">
          {t('legend.sample')}
        </mark>
        {t('legend.body', { threshold: LOW_CONFIDENCE })}
        <span aria-live="polite" className="ms-auto text-gray-600">
          {saved === 'saving' ? t('saving') : saved === 'saved' ? t('saved') : ''}
        </span>
      </p>

      {doc.pages.map((page) => (
        <PageView key={`${doc.id}-${page.number}`} page={page} pages={doc.pages.length} onEdit={onEdit} />
      ))}
    </div>
  );
}

const PageView = React.memo(function PageView({
  page,
  pages,
  onEdit,
}: {
  page: OcrPage;
  pages: number;
  onEdit: (page: number, lines: string[]) => void;
}) {
  const t = useTranslations('ai.canvas.ocr');
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    const url = URL.createObjectURL(page.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [page.image]);

  const lowOnPage = page.lines.reduce(
    (sum, line, index) =>
      page.edited && page.edited[index] !== lineText(line)
        ? sum
        : sum + line.words.filter((word) => word.confidence < LOW_CONFIDENCE).length,
    0
  );
  const headingId = `ocr-page-${page.number}`;

  const read = () => {
    const editor = editorRef.current;
    if (!editor) return;
    // Every child is a line: the paragraphs React wrote, the ones the browser
    // adds on Enter, and any bare text left after everything was deleted.
    const lines: string[] = [];
    editor.childNodes.forEach((node) => {
      const text = (node instanceof HTMLElement ? node.innerText : node.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      if (node instanceof HTMLElement) node.dir = lineDirection(text); // follows what it now says
      if (text || node instanceof HTMLElement) lines.push(text);
    });
    onEdit(page.number, lines);
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <header className="border-b border-gray-200 p-5">
        <CardHead
          icon={FileText}
          heading={t('page.heading', { page: page.number, pages })}
          caption={t('page.caption', { low: lowOnPage, confidence: page.confidence })}
        />
      </header>

      <div className="grid grid-cols-1 desktop:grid-cols-2">
        {/* The original, as scanned. */}
        <figure className="border-b border-gray-200 bg-gray-50 p-4 desktop:border-b-0 desktop:border-e">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob URL, never optimised by Next
            <img
              src={imageUrl}
              alt={t('page.imageAlt', { page: page.number })}
              width={page.width}
              height={page.height}
              className="h-auto w-full rounded-sm border border-gray-200 bg-white"
            />
          ) : null}
          <figcaption className="mt-2 text-caption text-gray-600">{t('page.original')}</figcaption>
        </figure>

        {/* The text, editable. */}
        <div className="p-4">
          <h3 id={headingId} className="sr-only">
            {t('page.textHeading', { page: page.number })}
          </h3>
          <div
            ref={editorRef}
            role="textbox"
            aria-multiline="true"
            aria-labelledby={headingId}
            contentEditable
            suppressContentEditableWarning
            spellCheck
            onInput={read}
            className="min-h-40 rounded-card border border-gray-300 bg-white p-4 text-body leading-relaxed text-gray-900 outline-none focus:border-legal-navy [&>p]:mb-2 [&>p]:text-start"
          >
            {/* Lines added or removed while editing: show the edits as they are. */}
            {page.edited && page.edited.length !== page.lines.length
              ? page.edited.map((text, index) => (
                  <p key={index} dir={lineDirection(text)}>
                    {text}
                  </p>
                ))
              : page.lines.map((line, index) => {
              const edited = page.edited?.[index];
              if (edited !== undefined && edited !== lineText(line)) {
                return (
                  <p key={index} dir={lineDirection(edited)}>
                    {edited}
                  </p>
                );
              }
              return (
                <p key={index} dir={line.dir}>
                  {line.words.map((word, wordIndex) => (
                    <React.Fragment key={wordIndex}>
                      {wordIndex > 0 ? ' ' : null}
                      {word.confidence < LOW_CONFIDENCE ? (
                        <mark
                          data-low=""
                          title={t('lowWord', { confidence: word.confidence })}
                          className="rounded-sm bg-warning/20 text-gray-900 underline decoration-warning-text decoration-dotted underline-offset-4"
                        >
                          {word.text}
                        </mark>
                      ) : (
                        word.text
                      )}
                    </React.Fragment>
                  ))}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
});

export default OcrCanvas;
