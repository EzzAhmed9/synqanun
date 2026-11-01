# OCR accuracy on the sample scan

Measured 26 October 2026 on `public/samples/ocr-sample-scan.pdf`. This is two
image-only A4 pages at 150 dpi: page 1 Arabic, page 2 English, with simulated
office-scanner damage (see `fixtures/ocr-sample.ts`).

The run used the real UI in headless Chromium: Document Canvas → Upload a scan
→ sample → Convert to editable (OCR). The text was read back from the
canvas's editor and compared with `fixtures/ocr-sample.ts` → `truth`.
Whitespace was collapsed before comparing, and all errors are counted as
Levenshtein distance. Script: `scripts/ocr-sample/measure.mjs`.

| Page | CER | WER | Lines read / in truth | Words flagged < 75% |
|---|---|---|---|---|
| Arabic (PDF page 1) | **5.29%** (5.12% ignoring diacritics) | **11.84%** | 15 / 14 | 8 of 153 on the document, all on page 1 |
| English (PDF page 2) | **0.00%** | **0.00%** | 14 / 14 | 0 |
| English (JPEG, image path) | **0.00%** | **0.00%** | 14 / 14 | 1 |

These two figures are measured with these meanings:

- **CER** (character error rate): character edits divided by characters in
  the truth.
- **WER** (word error rate): the same, by word.

The two pages took 7 seconds in total once the reader was cached. The first
conversion also downloads the reader (about 8 MB from this site), and in this
container that run took about 35 seconds.

## What the Arabic page got wrong

- The horizontal rule under the letterhead was read as a line of junk,
  "NC ا ا ا ب ل". It is highlighted, so it is easy to delete.
- In "18 أكتوبر 2026 الساعة العاشرة صباحًا", the reader returned "8 أكتوبر 6"
  and "Blo" for "صباحًا". **These are not highlighted.** The reader was
  confident and wrong, which is the reason the canvas tells people to check the
  text against the original, not only the highlights.
- Everything else matched, including the Arabic comma. The model returns ","
  and the engine restores "،" after an Arabic letter on a right-to-left line.

## What moved the numbers

The first version passed pages straight to Tesseract. On this sample it scored
29.81% CER on the Arabic page and 31.54% on the English one. Almost all of
those errors were scanner specks read as stray ":", "0" and "ee" at line
ends. A 3×3 median filter on a greyscale copy before reading
(`cleanForReading` in `lib/ocr/engine.ts`) brought the figures to those in the
table. The page image shown beside the text is the untouched original.

## What this does not tell you

The sample is clean printed text in two common typefaces, damaged
synthetically. Real scans are worse in ways this cannot measure. These read
badly, and the UI says so before a file is chosen:

- handwriting
- stamps and signatures over text
- photocopies of photocopies
- phone photos taken at an angle
- decorative Arabic fonts and dense diacritics
