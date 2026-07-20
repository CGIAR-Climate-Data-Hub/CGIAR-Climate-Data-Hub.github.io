---
name: cdh-record-authoring
description: Draft a valid CDH metadata record from a dataset description — required fields, spatial/temporal shapes, and the datacube dimension conventions. SAMPLE skill for the site's dev fixtures.
---

# CDH record authoring

SAMPLE SKILL — a stand-in until the real skills repository is connected.

Build the YAML record section by section: identity and license first, then
contacts (a licensor is required), assets with media types, and the
spatial/temporal blocks — a snapshot uses `date`, a span uses `start_date`
plus a nullable `end_date`, and the time axis is declared as a
`type: temporal` dimension. Validate against the standard before submitting.

Start from [the record template](references/record-template.md).
