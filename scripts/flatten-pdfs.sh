#!/bin/sh
# Quarto post-render: it mirrors the source tree, so move each wiki PDF from
# src/content/wikis/<wiki>/index.pdf to pdfs/<wiki>.pdf (gitignored).
set -e
mkdir -p pdfs
for f in $QUARTO_PROJECT_OUTPUT_FILES; do
  mv "$f" "pdfs/$(basename "$(dirname "$f")").pdf"
done
