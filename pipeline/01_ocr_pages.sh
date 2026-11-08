#!/usr/bin/env bash
# Usage: ./01_ocr_pages.sh book_section.pdf out_dir
# The guidebook PDFs are scans (no text layer). Render each page to grayscale 200 dpi,
# then OCR twice: plain text (for reading) and TSV (word boxes, for block grouping).
set -euo pipefail
pdf="$1"; out="$2"; mkdir -p "$out"
pdftoppm -r 200 -gray "$pdf" "$out/page"
ls "$out"/page-*.pgm | xargs -P 8 -I{} sh -c 'b=$(echo {} | sed "s/.pgm//"); tesseract {} $b -l eng --psm 3 >/dev/null 2>&1; tesseract {} $b -l eng --psm 3 tsv >/dev/null 2>&1'
