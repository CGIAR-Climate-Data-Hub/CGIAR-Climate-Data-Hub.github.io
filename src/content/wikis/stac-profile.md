---
title: STAC profile for the Climate Data Hub
description: Required and recommended STAC fields, with examples for raster, vector, and cube assets.
section: Standards
updated: 2026-05-10
order: 2
---

Alongside the YAML record, published datasets expose a
[STAC](https://stacspec.org) item so machines can discover and stream them.
This page defines the Hub's STAC profile: which fields are required, which are
recommended, and how they map to the CDH metadata standard.

## Required fields

Every item must set `id`, `bbox`, `geometry`, `datetime` (or
`start_datetime`/`end_datetime`), plus:

- `license` — SPDX identifier, matching the record's `license`
- `providers` — derived from the record's `contact` roles
- `assets` — one entry per distribution (Zarr store, COG prefix)

## Recommended extensions

- **datacube** — for Zarr stores: declare `cube:dimensions` and `cube:variables`
  so clients can subset without opening the store.
- **projection** — `proj:code` and `proj:shape` on raster assets.
- **scientific** — `sci:doi` and `sci:citation` when a DOI exists.

## Asset conventions

Asset keys are stable and lowercase: `zarr`, `cogs`, `metadata`. Media types
follow the record exactly, for example:

```json
{
  "zarr": {
    "href": "https://digital-atlas.s3.amazonaws.com/cdh/data/glw4-2020/glw4-2020.zarr",
    "type": "application/vnd.zarr; version=3",
    "roles": ["data"]
  }
}
```

## Mapping from the CDH record

The STAC item is generated, not hand-written. The pipeline maps `spatial.bbox`
→ `bbox`, `temporal` → interval, `data` → `assets`, and `citation` → the
scientific extension. If the two ever disagree, the YAML record wins.
