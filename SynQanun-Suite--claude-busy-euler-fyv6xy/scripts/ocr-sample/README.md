# OCR sample scan

Rebuilds `public/samples/ocr-sample-scan.pdf` (and its two page JPEGs) from
`truth.json`, and measures the in-browser OCR against it.

1. `node scripts/ocr-sample/render.mjs <outdir>`: renders each page from
   `truth.json` in Chromium (Noto Naskh Arabic / Noto Serif) as `clean-ar.png`
   and `clean-en.png`.
2. `python3 scripts/ocr-sample/degrade.py <outdir> public/samples`: adds
   skew, blur, noise, dust and uneven light, saves JPEGs, and writes the
   image-only PDF.
3. With the app running, `BASE=http://localhost:3000 OUT=/tmp node
   scripts/ocr-sample/measure.mjs en 1440 sample`: drives the real UI, reads
   the converted text back from the canvas, and prints CER and WER per page.
   It also lists every request to another host, which must be none.

`truth.json` must stay identical to `truth` in `fixtures/ocr-sample.ts`.
Results are recorded in `docs/ocr-accuracy.md`.
