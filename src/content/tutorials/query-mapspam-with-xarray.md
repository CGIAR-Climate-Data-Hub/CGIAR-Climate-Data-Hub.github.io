---
title: Query MAPSPAM crop production with xarray
description: Subset the MAPSPAM 2020 data cube by crop and technology, and summarise production for a country.
level: Intermediate
topic: Crops
time: 45 min
format: Notebook
outcomes:
  - Subset the cube by crop & technology
  - Build national production totals
  - Compute area-weighted yields
updated: 2026-07-06
---

[MAPSPAM 2020](/catalog/spam2020/) is distributed as a single Zarr data cube
with `crop` and `technology` dimensions and four variables: physical area,
harvested area, production, and yield. This tutorial subsets the cube and
builds a national production summary.

## Open the cube

```python
import xarray as xr

ds = xr.open_zarr(
    "https://digital-atlas.s3.amazonaws.com/cdh/data/mapspam2020-v2r2/spam2020-v2r2.zarr"
)
ds
```

The `crop` dimension uses MAPSPAM codes (`whea`, `rice`, `maiz`, …). The
full labels live in the crop-codes asset listed on the dataset page.

## Subset by crop and technology

```python
rainfed_maize = ds.sel(crop="maiz", technology="rainfed")
production = rainfed_maize["production"]
```

## Summarise for a country

Production is an absolute quantity, so a national total is a plain sum over
the country mask:

```python
total_t = production.where(kenya_mask).sum().item()
```

Yield is a *relative* quantity — never sum it. Use a harvested-area-weighted
mean instead:

```python
w = rainfed_maize["harvested_area"].where(kenya_mask)
mean_yield = (rainfed_maize["yield"] * w).sum() / w.sum()
```

## Caveats

MAPSPAM is downscaled from subnational statistics. It's built for national and
regional analysis — not field-scale decisions. See the dataset's
"Not recommended for" guidance.
