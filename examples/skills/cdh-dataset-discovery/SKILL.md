---
name: cdh-dataset-discovery
description: Find Climate Data Hub datasets that answer a question — search the catalog index, read record metadata, and pick the right distribution. SAMPLE skill for the site's dev fixtures.
---

# CDH dataset discovery

SAMPLE SKILL — a stand-in until the real skills repository is connected.

Fetch `/llms.txt` for a one-line map of every dataset, then `/catalog.json`
for the full schema.org `DataCatalog`. Each record's raw CDH metadata lives
at `/catalog/<id>.json`; match variables, geography, and temporal coverage
against the question before recommending a dataset.
