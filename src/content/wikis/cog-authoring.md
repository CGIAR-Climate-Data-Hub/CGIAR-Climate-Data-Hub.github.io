---
title: Cloud-Optimised GeoTIFF authoring
description: How to author COG-compliant rasters and validate them for the Hub.
section: Methods
updated: 2026-04-18
---

Cloud-Optimised GeoTIFFs (COGs) let clients read windows of a raster over HTTP
without downloading the whole file. All raster distributions on the Hub are
COGs; this page covers how to produce ones that pass review.

## Authoring

Use GDAL's COG driver — it handles tiling, overviews, and header layout in one
step:

```bash
gdal_translate input.tif output.tif -of COG \
  -co COMPRESS=DEFLATE -co PREDICTOR=2 -co BLOCKSIZE=512
```

For floating-point data prefer `PREDICTOR=3`, and always set an explicit
`nodata` value that matches the metadata record.

## Overviews

The COG driver builds overviews automatically. Check that the coarsest level
is small enough for a global preview (≤ 512 px on the long edge); add
`-co OVERVIEW_RESAMPLING=AVERAGE` for continuous data, `NEAREST` for
categorical data.

## Validation

Validate before submitting:

```bash
uvx rio-cogeo validate output.tif
```

Common failures are missing overviews, non-tiled layout from older GDAL
builds, and mismatched `nodata` between file and record.

## Naming

Files in a multi-file distribution follow the record's `href_template`, e.g.
`glw4-2020-{species}.tif` — one value per dimension slice, lowercase,
hyphen-separated.
