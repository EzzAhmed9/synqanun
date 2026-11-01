'use client';

import { currentLines, lineDirection, type OcrDocument } from './types';

/**
 * The converted text as a Word document, built in the browser with `docx`.
 *
 * One paragraph per line, in reading order, a page break between scanned
 * pages. A line that reads right to left becomes a right-to-left
 * (`bidirectional`) paragraph whose runs are marked `rightToLeft`, so Word
 * lays out Arabic correctly and keeps the punctuation and numerals of a mixed
 * line where they belong. Direction is decided per line from the EDITED text,
 * so a line the reader rewrote in the other language exports the right way.
 *
 * FONTS. Arabic (Word's "complex script") runs are set in `DOCX_ARABIC_FONT`,
 * Sakkal Majalla: Office's own Arabic text face, installed with Word on
 * Windows and on macOS, so the file opens the same for the firm and its
 * client. The brand's IBM Plex Sans Arabic is not installed with Word, and a
 * document in a font the recipient lacks is a document that reflows. Latin
 * runs are Calibri, Word's default, for the same reason.
 *
 * The file is built and downloaded locally; nothing is uploaded. The Word /
 * Microsoft Graph hand-off is a separate, unbuilt slot: lib/ocr/word-integration.ts.
 */
export const DOCX_ARABIC_FONT = 'Sakkal Majalla';
export const DOCX_LATIN_FONT = 'Calibri';

export async function buildDocx(document: OcrDocument): Promise<Blob> {
  const { AlignmentType, Document, Packer, Paragraph, TextRun } = await import('docx');

  const paragraphs = document.pages.flatMap((page, pageIndex) =>
    currentLines(page).map((text, lineIndex) => {
      const rtl = lineDirection(text) === 'rtl';
      return new Paragraph({
        bidirectional: rtl,
        // START follows the paragraph's own direction: right for Arabic.
        alignment: AlignmentType.START,
        pageBreakBefore: pageIndex > 0 && lineIndex === 0,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text,
            rightToLeft: rtl,
            font: { ascii: DOCX_LATIN_FONT, hAnsi: DOCX_LATIN_FONT, cs: DOCX_ARABIC_FONT },
            size: 24,
            sizeComplexScript: 28,
            language: { value: 'en-GB', bidirectional: 'ar-SA' },
          }),
        ],
      });
    })
  );

  const doc = new Document({
    creator: 'SynQanun Suite',
    title: document.name,
    description: 'Text converted from a scan by OCR in the browser. Check it against the original.',
    sections: [{ children: paragraphs }],
  });

  return Packer.toBlob(doc);
}

/** `scan.pdf` → `scan (OCR).docx`. */
export function docxFileName(name: string): string {
  return `${name.replace(/\.[^.]+$/, '')} (OCR).docx`;
}
