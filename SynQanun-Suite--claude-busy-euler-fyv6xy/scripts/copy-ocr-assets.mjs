#!/usr/bin/env node
/**
 * Copies the OCR runtime out of node_modules into public/ocr/vendor/, so the
 * browser loads every piece of it from this site and nothing from a CDN.
 *
 *  · tesseract.js's worker script
 *  · tesseract.js-core's three LSTM-only engines (plain, SIMD, relaxed SIMD);
 *    tesseract.js picks one at runtime by what the browser supports. The
 *    legacy (non-LSTM) engines are not copied: the tessdata_fast models are
 *    LSTM-only, so they would never load.
 *  · pdf.js and its worker, which render PDF pages to images in the browser.
 *    Loaded with a native import() from this site rather than bundled: the
 *    library is large, needed only when someone converts a PDF, and its ESM
 *    build is meant to be served as-is. The LEGACY build, which polyfills the
 *    newest JavaScript the modern build relies on (Map.getOrInsertComputed,
 *    among others) — without it, pdf.js 6 fails in browsers a firm actually
 *    runs, and failed in this project's own test Chromium.
 *
 * Runs before `next dev` and `next build` (package.json pre-scripts), so the
 * copies always match the installed versions. The copies are git-ignored; the
 * language data in public/ocr/tessdata/ is not in npm and is committed.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/ocr/vendor');
mkdirSync(out, { recursive: true });

const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
  ['node_modules/pdfjs-dist/legacy/build/pdf.min.mjs', 'pdf.min.mjs'],
  ['node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'],
];

for (const [from, to] of files) {
  copyFileSync(join(root, from), join(out, to));
}
console.log(`copy-ocr-assets: ${files.length} files → public/ocr/vendor/`);
