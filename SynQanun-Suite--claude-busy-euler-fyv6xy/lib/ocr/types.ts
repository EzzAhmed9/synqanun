/**
 * The shape of a document read by OCR, in the browser. Nothing here is ever
 * sent to the server: see lib/ocr/engine.ts and lib/ocr/store.ts.
 */

export interface OcrWord {
  text: string;
  /** Tesseract's own confidence, 0–100. Below `LOW_CONFIDENCE` is highlighted. */
  confidence: number;
}

export interface OcrLine {
  words: OcrWord[];
  /** Decided from the line's own letters — Arabic reads right to left. */
  dir: 'rtl' | 'ltr';
}

export interface OcrPage {
  /** 1-based, as a reader counts pages. */
  number: number;
  /** The page as it was read: the original beside the text. */
  image: Blob;
  width: number;
  height: number;
  lines: OcrLine[];
  /** Mean word confidence on the page, 0–100. */
  confidence: number;
  /**
   * The reader's edits, one string per line, or absent if untouched. Kept
   * beside the machine's reading rather than over it, so an edited line can
   * still be compared with what was scanned.
   */
  edited?: string[];
}

export interface OcrDocument {
  id: string;
  /** The file's own name. */
  name: string;
  createdAt: string;
  pages: OcrPage[];
}

/**
 * Words under this confidence are highlighted for checking. Tesseract's LSTM
 * confidences cluster in the 90s on clean print; a word in the 70s or below is
 * usually a misread or a guess at a smudge.
 */
export const LOW_CONFIDENCE = 75;

/** How many pages one conversion reads. Stated in the dialog, never silent. */
export const MAX_OCR_PAGES = 20;

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;
const LATIN = /[A-Za-z]/g;

/** A line is right-to-left when it holds more Arabic letters than Latin ones. */
export function lineDirection(text: string): 'rtl' | 'ltr' {
  const arabic = text.match(ARABIC)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;
  return arabic > latin ? 'rtl' : 'ltr';
}

/** A line's text as read, before any edit. */
export function lineText(line: OcrLine): string {
  return line.words.map((word) => word.text).join(' ');
}

/** The page's current lines: the reader's edits where there are any. */
export function currentLines(page: OcrPage): string[] {
  return page.edited ?? page.lines.map(lineText);
}
