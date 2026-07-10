---
title: Zonal statistics over livestock density
description: Aggregate GLW4 livestock densities to admin boundaries — correctly, with area weighting.
level: Intermediate
topic: Livestock
time: 45 min
format: Notebook
outcomes:
  - Convert densities to counts
  - Aggregate to admin boundaries
  - Sanity-check against census totals
updated: 2026-06-23
---

[GLW4](/catalog/glw4-2020/) values are densities (head/km²) on a lat/long grid,
where pixel ground area shrinks toward the poles. Naive zonal sums are biased.
This tutorial aggregates densities to admin-1 boundaries the right way.

## Load data and boundaries

```python
import geopandas as gpd
import rioxarray
import xarray as xr

ds = xr.open_zarr(
    "https://digital-atlas.s3.amazonaws.com/cdh/data/glw4-2020/glw4-2020.zarr"
)
goats = ds.sel(species="goat")["density"]
admin1 = gpd.read_file("gadm41_KEN_1.json")
```

## Convert density to counts

To get animal counts you must multiply each pixel by its true ground area.
Compute per-latitude pixel areas and convert:

```python
import numpy as np

# ~10 km grid: pixel area shrinks with cos(latitude)
cell_deg = 0.08333333
lat_m = 111_320 * cell_deg
lon_m = 111_320 * cell_deg * np.cos(np.deg2rad(goats.lat))
pixel_km2 = (lat_m * lon_m) / 1e6

counts = goats * pixel_km2
```

## Aggregate to admin areas

```python
counts.rio.write_crs("EPSG:4326", inplace=True)
per_admin = [
    counts.rio.clip([geom], drop=True).sum().item()
    for geom in admin1.geometry
]
admin1["goats"] = per_admin
```

## Sanity-check

GLW4 is a modelled distribution of census counts — totals should be in the
same order of magnitude as official statistics, not identical to them. For
exact counts, use the census sources listed on the dataset page.
