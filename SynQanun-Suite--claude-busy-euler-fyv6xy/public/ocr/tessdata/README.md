# Self-hosted OCR language data

`ara.traineddata.gz` and `eng.traineddata.gz` are the **tessdata_fast** models
from https://github.com/tesseract-ocr/tessdata_fast (branch `main`), gzipped
with `gzip -9` so tesseract.js can load them with `gzip: true`. They are
Apache-2.0 licensed, as the upstream repository is.

They are served from this site, never a CDN, so a scanned document's OCR never
asks a third party for anything. Checksums are in `SHA256SUMS`.

To refresh: download the two `.traineddata` files from that repository, gzip
them, replace these, and update `SHA256SUMS`.
