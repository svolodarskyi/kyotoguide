#!/usr/bin/env python3
"""Group Tesseract TSV words into (block, paragraph) text chunks per page.
Short chunks (<30 words) are the info column (address, phone, station, hours, price, web) and the tagline.
Long chunks (>=30 words) are the author's description. Two-column layouts can interleave them,
so every page still needs a human/LLM review pass (see SPEC.md, step 3).
Usage: 02_blocks.py ocr_dir > blocks.json"""
import csv, glob, json, collections, sys
out = {}
for f in sorted(glob.glob(sys.argv[1] + '/*.tsv')):
    blocks = collections.OrderedDict()
    for r in csv.DictReader(open(f, encoding='utf8'), delimiter='\t', quoting=csv.QUOTE_NONE):
        if r['level'] != '5' or not r['text'].strip():
            continue
        k = (r['block_num'], r['par_num'])
        blocks.setdefault(k, collections.OrderedDict()).setdefault(r['line_num'], []).append(r['text'])
    out[f.split('/')[-1][:-4]] = [' '.join(' '.join(l) for l in b.values()) for b in blocks.values()]
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)
