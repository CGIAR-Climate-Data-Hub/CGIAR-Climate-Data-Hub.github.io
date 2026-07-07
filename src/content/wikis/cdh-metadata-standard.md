---
title: CDH metadata standard
description: Core schema for dataset metadata, provenance, and licensing on the Hub.
section: Standards
updated: 2026-05-01
order: 1
---

Every dataset on the Hub is described by a single YAML record that follows the
[CDH metadata standard](https://github.com/CGIAR-Climate-Data-Hub/cdh-metadata-standard).
The record is the source of truth: catalog pages, search facets, and citations
are all generated from it.

## Record anatomy

A record has four parts:

1. **Identity** — `id`, `title`, `description`, `license`, `resource_type`, and `keywords`.
2. **Coverage** — `spatial` (bbox, geography, CRS, resolution) and `temporal` (date range, step).
3. **Structure** — `dimensions` and `variables` describing the data cube itself.
4. **Provenance** — `contact`, `citation`, `processing` steps, and source links.

## Required fields

At minimum a record must carry `id`, `title`, `description`, `license`, and
`resource_type`. Records missing coverage or provenance are accepted as drafts
but are not published to the catalog.

## Guidance blocks

The `cdh` extension adds fields the raw schema can't express: intended
`use_cases`, and — just as important — `not_recommended_for`, which pairs each
discouraged use with a reason and an alternative. Write these for the person
who has never seen the dataset before.

## Validation

Records are validated in CI against the published JSON Schema. Run it locally
before opening a submission:

```bash
uvx check-jsonschema --schemafile spec/schemas/profiles/cdh.schema.json my-record.yaml
```

## Versioning

The standard is semantically versioned. A record pins the version it was
written against in `cdh_schema_version`; migrations are documented in the
standard's changelog.
