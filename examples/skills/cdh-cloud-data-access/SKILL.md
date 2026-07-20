---
name: cdh-cloud-data-access
description: Read CDH datasets straight from object storage — subset Zarr cubes and Cloud-Optimized GeoTIFFs over HTTPS without downloading whole files. SAMPLE skill for the site's dev fixtures.
---

# CDH cloud data access

SAMPLE SKILL — a stand-in until the real skills repository is connected.

Every data asset is cloud-native: open Zarr stores with `xarray`, COGs with
`rioxarray`/GDAL, and Parquet with DuckDB or pandas, reading only the window
you need via HTTP range requests. Each record page carries worked Python and
R snippets per asset; templated assets resolve `{placeholders}` with the
record's dimension values.
