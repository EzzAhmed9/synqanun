'use client';

import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Worker as TesseractWorker } from 'tesseract.js';
import {
  MAX_OCR_PAGES,
  lineDirection,
  type OcrDocument,
  type OcrLine,
  type OcrPage,
} from './types';

/**
 * OCR, entirely in the browser.
 *
 * ===========================================================================
 * THE FILE NEVER LEAVES THE BROWSER
 * ===========================================================================
 * pdf.js renders each PDF page to a canvas, tesseract.js reads the canvas, and
 * the result is kept in this browser's IndexedDB (lib/ocr/store.ts). No step
 * posts the file, a page image or the text anywhere. The only network requests
 * are for the reader itself — tesseract's worker and engine, pdf.js, and the
 * Arabic and English language models — and every one of them is served from
 * this site's own /ocr/ folder, never a CDN (scripts/copy-ocr-assets.mjs,
 * public/ocr/tessdata/). They are fetched the first time someone converts a
 * document and cached by the browser after that.
 *
 * ===========================================================================
 * WHAT IT READS WELL, AND WHAT IT DOES NOT
 * ===========================================================================
 * tessdata_fast's Arabic and English LSTM models, together ("ara+eng"). Clean
 * printed text reads well. Handwriting, stamps, signatures, low-resolution or
 * skewed scans, and decorative fonts read badly, and the UI says so before a
 * file is chosen. Every word carries tesseract's confidence; the canvas
 * highlights the low ones for checking.
 */

export type OcrStage =
  | { kind: 'loadingReader'; progress: number }
  | { kind: 'rendering'; page: number; pages: number }
  | { kind: 'reading'; page: number; pages: number; progress: number };

const BASE = '/ocr';
/** Render scale for PDF pages: about 216 dpi on an A4 page, enough for 10pt. */
const PDF_SCALE = 3;

/** Thrown when the reader cancels; the caller treats it as a quiet stop. */
export class OcrCancelled extends Error {
  constructor() {
    super('OCR cancelled');
  }
}

export async function runOcr(
  file: Blob,
  name: string,
  {
    onStage,
    signal,
  }: {
    onStage: (stage: OcrStage) => void;
    signal?: AbortSignal;
  }
): Promise<{ document: OcrDocument; truncatedFrom: number | null }> {
  const check = () => {
    if (signal?.aborted) throw new OcrCancelled();
  };

  // 1 · The pages, as canvases ------------------------------------------
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(name);
  let canvases: HTMLCanvasElement[];
  let truncatedFrom: number | null = null;

  if (isPdf) {
    const pdfjs = await loadPdfJs();
    check();
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      // Scanned pages are images; nothing here needs the PDF's fonts.
      disableFontFace: true,
    });
    const pdf: PDFDocumentProxy = await task.promise;
    const count = Math.min(pdf.numPages, MAX_OCR_PAGES);
    if (pdf.numPages > MAX_OCR_PAGES) truncatedFrom = pdf.numPages;
    canvases = [];
    for (let n = 1; n <= count; n += 1) {
      check();
      onStage({ kind: 'rendering', page: n, pages: count });
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: PDF_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      canvases.push(canvas);
      page.cleanup();
    }
    await pdf.cleanup();
    await task.destroy();
  } else {
    onStage({ kind: 'rendering', page: 1, pages: 1 });
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
    bitmap.close();
    canvases = [canvas];
  }
  check();

  // 2 · The reader ---------------------------------------------------------
  let pageIndex = 0;
  const { createWorker, OEM } = await import('tesseract.js');
  onStage({ kind: 'loadingReader', progress: 0 });
  const worker: TesseractWorker = await createWorker(['ara', 'eng'], OEM.LSTM_ONLY, {
    workerPath: `${BASE}/vendor/worker.min.js`,
    corePath: `${BASE}/vendor`,
    langPath: `${BASE}/tessdata`,
    gzip: true,
    // The worker script is same-origin; no blob URL is needed to load it.
    workerBlobURL: false,
    logger: (message) => {
      if (message.status === 'recognizing text') {
        onStage({
          kind: 'reading',
          page: pageIndex + 1,
          pages: canvases.length,
          progress: message.progress,
        });
      } else if (/loading|initializ/i.test(message.status)) {
        onStage({ kind: 'loadingReader', progress: message.progress });
      }
    },
  });

  const abort = () => void worker.terminate();
  signal?.addEventListener('abort', abort);

  try {
    // 3 · Each page ------------------------------------------------------
    const pages: OcrPage[] = [];
    for (; pageIndex < canvases.length; pageIndex += 1) {
      check();
      const canvas = canvases[pageIndex];
      onStage({ kind: 'reading', page: pageIndex + 1, pages: canvases.length, progress: 0 });
      // Read a cleaned copy; keep the original for the page image.
      const { data } = await worker.recognize(cleanForReading(canvas), {}, { text: true, blocks: true });
      check();

      const lines: OcrLine[] = [];
      const confidences: number[] = [];
      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            const words = line.words
              .map((word) => ({ text: word.text.trim(), confidence: Math.round(word.confidence) }))
              .filter((word) => word.text.length > 0);
            if (words.length === 0) continue;
            words.forEach((word) => confidences.push(word.confidence));
            const dir = lineDirection(words.map((word) => word.text).join(' '));
            lines.push({ words: dir === 'rtl' ? words.map(arabicPunctuation) : words, dir });
          }
        }
      }

      pages.push({
        number: pageIndex + 1,
        image: await canvasToJpeg(canvas),
        width: canvas.width,
        height: canvas.height,
        lines,
        confidence: confidences.length
          ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
          : 0,
      });
    }

    return {
      document: {
        id: `ocr-${Date.now().toString(36)}`,
        name,
        createdAt: new Date().toISOString(),
        pages,
      },
      truncatedFrom,
    };
  } finally {
    signal?.removeEventListener('abort', abort);
    await worker.terminate().catch(() => undefined);
  }
}

/**
 * Tesseract's Arabic model returns Latin ',', ';' and '?' where the page has
 * '،', '؛' and '؟'. On a right-to-left line, one of those straight after an
 * Arabic letter is put back in its Arabic form. Nothing else is rewritten:
 * every other character is what the reader read.
 */
function arabicPunctuation<T extends { text: string }>(word: T): T {
  const text = word.text
    .replace(/([\u0600-\u06FF]),/g, '$1،')
    .replace(/([\u0600-\u06FF]);/g, '$1؛')
    .replace(/([\u0600-\u06FF])\?/g, '$1؟');
  return text === word.text ? word : { ...word, text };
}

/**
 * A greyscale copy with salt-and-pepper speckle removed (a 3×3 median), which
 * is what a scanner adds to every page: dust on the glass, sensor noise, the
 * dots of a photocopied photocopy. Tesseract reads specks as stray ':', '0'
 * and 'ee' at the ends of lines; the median removes them without thinning
 * strokes the way a blur would. Binarisation is left to Tesseract's own Otsu.
 * The reader sees the ORIGINAL page image beside the text, never this copy.
 */
function cleanForReading(source: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = source;
  const pixels = source.getContext('2d')!.getImageData(0, 0, width, height);
  const data = pixels.data;
  const grey = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    grey[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
  }
  const out = new Uint8ClampedArray(grey);
  const window = new Uint8Array(9);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        const row = (y + dy) * width + x;
        window[k++] = grey[row - 1];
        window[k++] = grey[row];
        window[k++] = grey[row + 1];
      }
      window.sort();
      out[y * width + x] = window[4];
    }
  }
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    data[i] = data[i + 1] = data[i + 2] = out[j];
  }
  const clean = document.createElement('canvas');
  clean.width = width;
  clean.height = height;
  clean.getContext('2d')!.putImageData(pixels, 0, 0);
  return clean;
}

/** The page image kept beside the text: a JPEG, to keep IndexedDB small. */
function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.82)
  );
}

type PdfJs = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfJs> | null = null;

/**
 * pdf.js, from this site's /ocr/vendor/ with a native import — not bundled.
 * `webpackIgnore` keeps the bundler from trying to resolve or split it; the
 * file is the library's own ESM build, copied by scripts/copy-ocr-assets.mjs.
 */
function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import(/* webpackIgnore: true */ `${BASE}/vendor/pdf.min.mjs`).then(
    (module: PdfJs) => {
      module.GlobalWorkerOptions.workerSrc = `${BASE}/vendor/pdf.worker.min.mjs`;
      return module;
    }
  );
  return pdfjsPromise;
}
