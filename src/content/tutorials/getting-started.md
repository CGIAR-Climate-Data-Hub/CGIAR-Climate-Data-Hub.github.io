---
title: Getting started with the Climate Data Hub
description: Find a dataset, read its metadata, and pull a layer into Python in twenty minutes.
level: Beginner
topic: Onboarding
time: 20 min
format: Notebook
updated: 2026-06-01
---

This tutorial walks the shortest path from "I need climate data" to a raster
in memory. You'll use the catalog to find a dataset, read its record, and open
a distribution with standard Python tools.

## Find a dataset

Browse the [catalog](/catalog) or search from any page. Each result is backed
by a metadata record that tells you what the data is, where it comes from, and
— just as important — what it should *not* be used for. Read the
"Not recommended for" block before committing to a dataset.

## Read the record

Open the [GLW4 livestock density](/catalog/glw4-2020) page. The record tells
you the data is a Zarr store and a set of COGs, gridded at 5 arc-minutes,
with a `species` dimension covering six livestock species.

## Open it in Python

The Zarr distribution streams directly — no download needed:

```python
import xarray as xr

ds = xr.open_zarr(
    "https://digital-atlas.s3.amazonaws.com/cdh/data/glw4-2020/glw4-2020.zarr"
)
cattle = ds.sel(species="cattle")["density"]
cattle.plot()
```

Single GeoTIFFs work with rasterio or rioxarray:

```python
import rioxarray

url = "https://digital-atlas.s3.amazonaws.com/cdh/data/glw4-2020/cogs/glw4-2020-cattle.tif"
cattle = rioxarray.open_rasterio(url, masked=True)
```

## Cite what you use

Every dataset page has a copy-ready citation and licence. Cite the original
producers — for GLW4 that's FAO — alongside the Hub record.

## Next steps

- [Query MAPSPAM crop production with xarray](/tutorials/query-mapspam-with-xarray)
- [Zonal statistics over livestock density](/tutorials/livestock-density-zonal-stats)
