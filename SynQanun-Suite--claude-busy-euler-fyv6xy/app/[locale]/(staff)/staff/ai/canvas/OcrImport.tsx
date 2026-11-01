'use client';

import * as React from 'react';
import { FileUp, Lock, ScanText, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Modal } from '@/components/ui';
import { formatFileSize } from '@/lib/format';
import { useRouter } from '@/lib/i18n/navigation';
import { useLocale } from 'next-intl';
import type { Locale } from '@/lib/i18n/routing';
import { OCR_SAMPLE } from '@/fixtures/ocr-sample';
import { MAX_OCR_PAGES } from '@/lib/ocr/types';
import type { OcrStage } from '@/lib/ocr/engine';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';

/**
 * "Upload a scan" → "Convert to editable (OCR)". The dialog that takes a
 * scanned PDF or a photo of a page and reads it, in the browser.
 *
 * What it promises, it says before the file is chosen:
 *  · THE FILE NEVER LEAVES THE BROWSER. pdf.js and tesseract.js run here; the
 *    only downloads are the reader and its Arabic and English models, from
 *    this site, once. See lib/ocr/engine.ts.
 *  · IT CAN READ BADLY. Handwriting, stamps, faint or skewed scans. The canvas
 *    then highlights every word the reader was unsure of.
 *
 * Progress is a real progress bar with a stage line, announced politely, and
 * the conversion can be cancelled mid-page. A sample scan is offered so the
 * flow can be tried without a document to hand — fetched from this site, so
 * it does not leave the browser either.
 *
 * Neutral chrome and the tenant's `primary` for Convert: OCR is the reader's
 * own action on their own file, not the assistant speaking (design.md §2).
 */
export function OcrImportButton({ autoOpen = false }: { autoOpen?: boolean }) {
  const t = useTranslations('ai.canvas.ocr.import');
  const [open, setOpen] = React.useState(autoOpen);

  return (
    <>
      <Button variant="secondary" icon={<ScanText aria-hidden size={15} />} onClick={() => setOpen(true)}>
        {t('open')}
      </Button>
      {open ? <OcrImportDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function OcrImportDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('ai.canvas.ocr.import');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const inputId = React.useId();
  const [file, setFile] = React.useState<File | null>(null);
  const [stage, setStage] = React.useState<OcrStage | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const controller = React.useRef<AbortController | null>(null);
  const running = stage !== null;

  const choose = (picked: File | null) => {
    setError(null);
    if (!picked) return setFile(null);
    if (!/\.(pdf|png|jpe?g|webp)$/i.test(picked.name)) {
      setFile(null);
      setError(t('errors.type'));
      return;
    }
    setFile(picked);
  };

  const useSample = async () => {
    setError(null);
    const response = await fetch(OCR_SAMPLE.pdf);
    const blob = await response.blob();
    setFile(new File([blob], OCR_SAMPLE.fileName, { type: 'application/pdf' }));
  };

  const convert = async () => {
    if (!file) {
      setError(t('errors.noFile'));
      return;
    }
    setError(null);
    controller.current = new AbortController();
    setStage({ kind: 'rendering', page: 1, pages: 1 });
    try {
      const [{ runOcr }, { saveOcrDocument }] = await Promise.all([
        import('@/lib/ocr/engine'),
        import('@/lib/ocr/store'),
      ]);
      const { document } = await runOcr(file, file.name, {
        onStage: setStage,
        signal: controller.current.signal,
      });
      await saveOcrDocument(document);
      router.push({ pathname: '/staff/ai/canvas', query: { source: 'ocr', id: document.id } });
      onClose();
    } catch (caught) {
      setStage(null);
      if ((caught as Error)?.message === 'OCR cancelled') return;
      setError(t('errors.failed'));
    }
  };

  const cancel = () => {
    controller.current?.abort();
    setStage(null);
  };

  const { fraction, line } = describe(stage, t);

  return (
    <Modal
      open
      onClose={running ? () => undefined : onClose}
      dismissible={!running}
      title={t('title')}
      description={t('description')}
      size="md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={running ? cancel : onClose}>
            {running ? t('stop') : t('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={convert}
            loading={running}
            disabled={!file}
            icon={<ScanText aria-hidden size={15} />}
          >
            {t('convert')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* The promise, before anything is chosen. */}
        <div className="flex items-start gap-3 rounded-card border border-gray-300 bg-gray-100 p-3">
          <Lock aria-hidden size={16} className="mt-0.5 shrink-0 text-gray-600" />
          <p className="text-caption text-gray-700">{t('privacy')}</p>
        </div>
        <div className="flex items-start gap-3 rounded-card border border-warning/40 bg-warning/10 p-3">
          <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0 text-warning-text" />
          <p className="text-caption text-gray-700">{t('limits')}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-caption font-medium text-gray-700">
            {t('fileLabel')}
          </label>
          <input
            id={inputId}
            type="file"
            accept={ACCEPT}
            disabled={running}
            onChange={(event) => choose(event.target.files?.[0] ?? null)}
            className="block w-full text-body text-gray-700 file:me-3 file:rounded-btn file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-2 file:text-body file:text-gray-700"
          />
          <p className="text-caption text-gray-600">{t('fileHint', { pages: MAX_OCR_PAGES })}</p>
          <button
            type="button"
            disabled={running}
            onClick={useSample}
            className="inline-flex w-fit items-center gap-1.5 text-caption font-medium text-legal-navy hover:underline disabled:text-gray-500"
          >
            <FileUp aria-hidden size={14} />
            {t('sample')}
          </button>
        </div>

        {file ? (
          <p className="text-body text-gray-700">
            <bdi>{file.name}</bdi>{' '}
            <span className="text-caption text-gray-600 [unicode-bidi:isolate]">
              ({formatFileSize(file.size, locale)})
            </span>
          </p>
        ) : null}

        {/* Progress: a real bar with a stage line, announced politely. */}
        {running ? (
          <div className="flex flex-col gap-2">
            <div
              role="progressbar"
              aria-label={t('progressLabel')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fraction * 100)}
              className="h-2 w-full overflow-hidden rounded-pill bg-gray-200"
            >
              <div
                className="h-full origin-[left_center] rounded-pill bg-action transition-transform rtl:origin-[right_center]"
                style={{ transform: `scaleX(${Math.max(0.02, fraction)})` }}
              />
            </div>
            <p aria-live="polite" className="text-caption text-gray-700 [unicode-bidi:isolate]">
              {line}
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-body text-error">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

/** One number for the bar and one sentence for the line, from the engine's stage. */
function describe(
  stage: OcrStage | null,
  t: (key: string, values?: Record<string, number>) => string
): { fraction: number; line: string } {
  if (!stage) return { fraction: 0, line: '' };
  switch (stage.kind) {
    case 'rendering':
      return {
        fraction: 0.1 * (stage.page / stage.pages),
        line: t('stage.rendering', { page: stage.page, pages: stage.pages }),
      };
    case 'loadingReader':
      return { fraction: 0.1 + 0.1 * stage.progress, line: t('stage.loadingReader') };
    case 'reading':
      return {
        fraction: 0.2 + 0.8 * ((stage.page - 1 + stage.progress) / stage.pages),
        line: t('stage.reading', {
          page: stage.page,
          pages: stage.pages,
          percent: Math.round(stage.progress * 100),
        }),
      };
  }
}

export default OcrImportButton;
