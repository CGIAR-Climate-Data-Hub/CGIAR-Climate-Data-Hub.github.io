---
title: Cloud-optimizing data
description: How cloud-optimized formats improve data access, how to choose a suitable layout, and examples of their effect on downloads.
group: Data standards
updated: 2026-10-23
order: 3
---

The Hub aims to make analysis-ready, cloud-optimized (ARCO) data available
wherever that is practical and useful. Formats such as Cloud Optimized GeoTIFF,
Zarr, and GeoParquet let people read the parts of a dataset they need without
downloading the rest. For large climate and agricultural datasets this makes a
real difference, especially when an analysis only needs one region, a few
variables, or a particular period.

## Data as the API

The Hub does not provide a single API for all its data. Instead, the data itself
is the API: well-described files that people and tools can open directly. A
[metadata record](/wikis/metadata-conventions/) describes the dataset and links
to its files. A reader then requests the chunks it needs, or uses HTTP range
requests to pull selected parts of a file.

This means data can be served from ordinary web or object storage without a
dedicated API server for each dataset. People can keep using the tools they
already know, such as GDAL, xarray, terra, and DuckDB, or browser libraries that
support the format. Storage and access still have to be maintained, but most of
the work of selecting and reading data happens in the user's own tools.

Datasets hosted elsewhere may already provide good access through files or APIs.
The Hub can link to those directly, or prepare an ARCO copy where that would
improve access. The [data conventions](/wikis/data-conventions/) explain when
the Hub hosts data and how its files are organized.

## Why cloud optimization matters

Reading only the data you need saves download time, bandwidth, and disk space.
Someone working on one country may need a small fraction of a global raster. How
much they save depends on how the file is laid out and whether their reader and
the hosting service support partial reads.

These formats build on established tools and conventions, and all of them allow
independent, parallel reads that fetch only the variables, regions, and periods
requested. COG does this by organizing a GeoTIFF into internal tiles and
overviews, Zarr by splitting multidimensional arrays into separately stored
chunks, and Parquet by storing tables column by column in row groups that a
query can skip. GeoParquet adds a standard way to store geometries in Parquet.
Each tile, chunk, or column is compressed on its own, so files stay small and a
reader can fetch and decompress only the parts it needs.

## What makes a file cloud-optimized

Efficient remote access comes down to how the data and its metadata are
arranged. The common ingredients are:
1. **Independently readable sections.** Tiles, chunks, or column chunks within
   row groups let a reader retrieve selected parts of a dataset.
2. **Metadata that locates the data.** Headers, chunk metadata, and footers say
   where everything is, so a reader can find the parts it needs.
3. **Overviews or statistics where supported.** Lower-resolution overviews
   support map previews, and statistics let readers skip sections that cannot
   match a query.

This extends the Hub's habit of working with metadata before data. The catalog
helps find a suitable asset, and the metadata inside that asset helps a reader
get at the relevant content efficiently.

## The formats

Choose a format based on the structure of the data, the tools that will read it,
and how people are likely to access it. The following cover the common Hub
cases.

### Rasters: COG

A Cloud Optimized GeoTIFF (COG) arranges raster data in tiles, with the metadata
placed so a reader can find them cheaply. Overviews provide lower-resolution
versions for displaying larger areas. Readers that support remote access fetch
only the tiles or overview they need, and the file is still an ordinary GeoTIFF
for everything else. See the
[GDAL COG documentation](https://gdal.org/en/stable/drivers/raster/cog.html).

Include the missing-value indicator (`nodata`), coordinate reference system
(CRS), and any scale or offset in the file so readers can interpret the values.
The creation options worth tuning, such as sparse tiles, the predictor, and the
tile size, are covered under [Doing it well](#cog). Layers that are accessed on
their own are best as separate COGs; a multi-band COG suits bands that are
usually read together.

### Cubes: Zarr

Zarr stores arrays as chunks, with metadata describing their structure. It suits
multidimensional data such as climate datasets with space, time, model, and
scenario dimensions. Tools such as xarray read the chunks they need without
loading the whole dataset.

Include Climate and Forecast (CF) metadata such as `units`, `long_name`, and a
valid `standard_name` where one exists.
[GeoZarr](https://github.com/zarr-developers/geozarr-spec) provides conventions
for geospatial metadata; use them where the tools producing and reading the data
support them. Choose chunk sizes for the expected access patterns, as the
[cube comparison](#cubes) shows.

### Tables: Parquet

Parquet is a columnar file format for tables. Each column is stored separately
within row groups, so a reader can load only the attributes it needs. When the
file carries statistics, a reader can also skip row groups that cannot match a
filter.

This helps most when an analysis needs a few columns from a large table.
Compression and dictionary encoding shrink the file further, particularly for
repeated codes and names. Arrange rows around the fields people filter on, so
matching rows sit together and the other row groups can be skipped.

### Vectors: GeoParquet

GeoParquet stores vector data in Parquet, with standard metadata describing the
geometry column and CRS. It keeps Parquet's column selection and row-group
skipping and adds spatial filtering. Compared with Shapefile, it has no sidecar
files and none of the field-name and file-size limits.

GeoParquet works across GIS and analysis tools with Parquet support, including
GeoPandas, DuckDB, and GDAL-based tools. GeoPackage is still a good choice for
local GIS work, particularly where its spatial index supports repeated queries
over large polygon datasets.

### Other formats and access options

- **Icechunk** adds transactions and versioned snapshots to Zarr, which helps
  when a store is updated over time.
- **VirtualiZarr and kerchunk** give virtual access to existing files, such as
  NetCDF or GeoTIFF, without making a full copy of the data.
- **FlatGeobuf** supports efficient access to vector features and suits
  applications such as browser maps.
- **PMTiles** packages map tiles for direct access, useful when a dataset needs
  a map viewer.

## Comparing data layouts

Layout decides how much of a file a reader has to fetch to answer a question. To
show the effect, we wrote the same data in a classic layout and a
cloud-optimized one, served both over HTTP, and read them with the usual tools:
rioxarray, xarray, pandas, and GeoPandas. The numbers below are the bytes and
requests each read actually made. The test files are only a few megabytes, so
the ratios matter more than the sizes. To translate them to real datasets, the
sections below assume a 10 Mbit/s connection, which is a realistic field-office
link. On it, 1 GB takes about 13 minutes to download and 100 GB takes a day.

### Rasters

The two things people usually want from a raster are to see the whole thing on a
map and to get their own country out of it. A GeoTIFF stored in strips does both
badly. A zoomed-out view has to read nearly the whole file, and a country's
window pulls every full-width row that crosses it. A COG stores the same pixels
in tiles and adds overviews, so a country costs only the tiles it covers and a
zoomed-out view costs only the overview.

In the test, a 2.5 MB striped GeoTIFF needed 1.9 MB for the zoomed-out view and
0.7 MB for a window the size of a few countries. The COG needed **66 KB** and
**0.3 MB** for the same two reads, and fetched the overview in one request
rather than four. The COG is larger on disk, 3.7 MB, because it carries the
overviews. That is the one cost, and it buys a zoomed-out view that moves thirty
times less data.

For a 100 GB global raster, this is the difference between a dataset people can
use and one they cannot. Viewing a striped file zoomed out means downloading all
of it, a day on a slow link. From a COG, a map viewer fetches the overview that
fits the screen, a megabyte or two, in a second or so. Clipping one country from
a striped file pulls every row it crosses, around 1 GB and a quarter of an hour.
From a COG it pulls the tiles over that country, a few megabytes, in seconds,
and nothing needs to be installed or stored locally.

### Cubes

A climate cube has two kinds of user: one wants a map for a single date, the
other wants the full history at a single place. Chunks are the unit a reader
fetches, so the chunk shape decides which of them is well served. A chunk that
holds one month's map is ideal for the map and hopeless for the series, which
has to touch a chunk for every month.

In the test, a 5.0 MB NetCDF file with one map per chunk needed the
**entire
file, in 268 requests**,
to return a 20-year series at one point, about 29 seconds on a moderate
connection. A Zarr store with balanced chunks, 60 months over a 32 by 32 pixel
area, answered the same question with
**0.2 MB in 16
requests**,
under two seconds, and still returned a single map for 0.8 MB. The format made
little difference. NetCDF and Zarr with the same chunks behave almost the same;
the chunk shape is what matters.

How the values are stored is the second lever. The data has two decimals, so
int16 with a scale factor holds it exactly, and lining the bits up before
compression (Blosc zstd with bitshuffle) took the store from
**5.0 MB to
3.1 MB**
without losing anything.

Take a 20 GB store of daily rainfall, roughly 40 years of daily maps. From a
map-chunked store, a station's full series is one request per day, around 15,000
of them, and the whole store comes down: four or five hours of transfer plus
nearly half an hour of waiting on round trips. From a store with balanced
chunks, the same question pulls a few megabytes in a few dozen requests and the
answer is back in seconds. A country's rainfall on one day costs a few megabytes
either way. Choose the chunk shape for the questions people actually ask, and
write it down so they know what is cheap.

### Tables

Survey and statistics tables are usually read in one of two ways: one column
across everyone, or everything about one country in one year. A CSV has no
structure a remote reader can use, so either question costs the whole file. A
spreadsheet costs more, because the reader fetches it twice. Parquet stores each
column separately and keeps statistics for each block of rows, so a one-column
read fetches only that column and a filter can skip the blocks that cannot
match.

The test table looks like a household survey: 100,000 rows and 69 mostly short
coded answers. As CSV it is 15.2 MB; as Parquet with zstd it is **2.2 MB**. The
mean of one column read **0.1 MB** from Parquet against all 15.2 MB from the
CSV, more than a hundred times less. Sorting the file by country and year
brought the one-country, one-year read down to **1.4 MB**. Unsorted, every block
holds a few rows from every country and nothing can be skipped. The Excel file
needed 45.7 MB for either question, three times the CSV.

Real survey data usually compresses better than generated data, because real
answers repeat: most households answer "no", most counts are zero, and whole
modules are blank. Even at the test's sevenfold ratio, a 5 GB survey CSV, an
hour's download on a slow link, becomes a file under 1 GB, and the mean of one
column is a few tens of megabytes and under a minute. One country in one year
from a file sorted by country and year is just the handful of blocks that match.
Sort by the fields people filter on most. Tuning for one access pattern can cost
another, as the sorted file's larger one-column read shows.

### Vectors

Boundary and feature datasets get asked for an area, or for a list of names. A
spatial query needs either an index or a spatially sorted file; without one, it
is a full scan. A names query needs the attributes to be stored apart from the
geometry, which GeoParquet does and GeoPackage does not.

The test used 2,000 polygons in random order and a bounding box covering about
2% of them. The Shapefile had to be read in full, 10.1 MB in 28 requests.
GeoParquet sorted along a Hilbert curve, so that neighbours share a row group,
answered with **1.0 MB in 4 requests**, under a second, which matches an indexed
GeoPackage without needing an index. Unsorted GeoParquet was no better than the
Shapefile, because every row group spanned the whole map. The sort is what
matters. For the names query, GeoParquet read **0.2 MB** where GeoPackage read
9.9 MB, nearly the whole file.

For a 2 GB set of administrative boundaries, listing the unit names from a
GeoPackage is a half-hour download for a few thousand strings. From GeoParquet
it is one column, a few megabytes, in seconds. One country's boundaries from a
sorted GeoParquet file are the row groups covering that area, tens of megabytes,
where the unsorted file or a Shapefile would be the full 2 GB. Compression does
little for dense polygon coordinates, so nearly all of the saving here comes
from layout.

<details>
<summary>Benchmark results in full</summary>

The test files: a 2000 x 1000 float32 raster with missing values; a (240, 90, 180)
float32 cube of 20 years of monthly data; a 100,000-row, 69-column survey table
filtered by `country == C07 and year == 2020`, with 50,000-row groups; and 2,000
polygons of 300 vertices each in random order, queried with a bounding box
covering about 2% of the extent, with 50-feature row groups. Times are estimates
for a 20 Mbit/s connection with 100 ms per request.

| raster layout         | file size | 256 x 256 window | 1/8 overview | overview time |
| --------------------- | --------- | ---------------- | ------------ | ------------- |
| striped, uncompressed | 8.0 MB    | 2.1 MB           | 5.9 MB       | 2.8 s         |
| striped, deflate      | 2.5 MB    | 0.7 MB           | 1.9 MB       | 1.1 s         |
| COG, deflate          | 3.7 MB    | 0.3 MB           | 66 KB        | 0.1 s         |
| COG, zstd             | 3.7 MB    | 0.3 MB           | 66 KB        | 0.1 s         |

| cube format, chunks (time, y, x)            | store  | one full map       | one point, full series | series time |
| ------------------------------------------- | ------ | ------------------ | ---------------------- | ----------- |
| NetCDF4 float32 (1, 90, 180)                | 5.0 MB | 39 KB, 25 requests | 5.0 MB, 268 requests   | 29 s        |
| Zarr float32 (1, 90, 180)                   | 5.5 MB | 28 KB, 13 requests | 5.5 MB, 252 requests   | 27 s        |
| Zarr float32 (240, 16, 16)                  | 4.6 MB | 4.6 MB             | 81 KB                  | 1.3 s       |
| Zarr float32 (60, 32, 32)                   | 4.7 MB | 1.2 MB             | 0.3 MB                 | 1.7 s       |
| Zarr int16 packed, bitshuffle, (60, 32, 32) | 3.1 MB | 0.8 MB             | 0.2 MB                 | 1.7 s       |

| table format                            | file size | one country, one year             | one column, all rows | column time |
| --------------------------------------- | --------- | --------------------------------- | -------------------- | ----------- |
| CSV                                     | 15.2 MB   | 15.2 MB                           | 15.2 MB              | 6.2 s       |
| Excel                                   | 38.0 MB   | 45.7 MB (pandas fetches it twice) | same                 | 19 s        |
| Parquet, snappy                         | 2.8 MB    | 2.8 MB                            | 0.2 MB               | 0.5 s       |
| Parquet, zstd                           | 2.2 MB    | 2.2 MB                            | 0.1 MB               | 0.5 s       |
| Parquet, zstd, sorted by filter columns | 2.8 MB    | 1.4 MB                            | 0.6 MB               | 0.8 s       |

| vector format                    | size    | bbox read                     | one attribute, no geometry | attribute time |
| -------------------------------- | ------- | ----------------------------- | -------------------------- | -------------- |
| Shapefile                        | 10.1 MB | 10.1 MB (no index: full scan) | 0.4 MB (just the .dbf)     | 1.7 s          |
| GeoPackage                       | 10.0 MB | 1.1 MB (R-tree)               | 9.9 MB                     | 6.9 s          |
| GeoParquet, zstd                 | 9.4 MB  | 9.4 MB                        | 78 KB                      | 4.2 s          |
| GeoParquet, zstd, Hilbert-sorted | 9.2 MB  | 1.0 MB                        | 0.2 MB                     | 4.4 s          |

</details>

> To reproduce these benchmarks, see
> [`examples/benchmarks/cloud_optimized_benchmark.py`](https://github.com/CGIAR-Climate-Data-Hub/CGIAR-Climate-Data-Hub.github.io/blob/main/examples/benchmarks/cloud_optimized_benchmark.py)
> in the site repository. It generates the example data, serves it over local
> HTTP, and counts the bytes and requests each reader makes.

## Doing it well

The comparisons above show why layout matters. This section is the checklist for
getting it right. The benchmark does not prove any of it; this is the
established practice behind each format, and what the Hub does by default unless
a dataset gives a reason not to.

### Rules that apply everywhere

- **Compress with zstd.** It matches deflate's ratios at several times the
  decode speed, and GDAL, Zarr (through Blosc), and Parquet all support it. Use
  deflate only when a reader cannot handle zstd. Never publish uncompressed
  files.
- **Store the precision you have, not the type you were given.** Data with two
  decimals fits int16 with a scale factor, class codes fit uint8, and float64 is
  almost never justified. Packing floats to scaled integers halves the raw size
  before compression starts, and the result compresses far better.
- **Make the unit of access a few megabytes.** Tiles, chunks, and row groups
  that are too small cost a round trip each. Too large, and every read drags
  along data nobody asked for. Between 1 and 10 MB compressed is a good range.
- **Round deliberately, and say so.** Rounding to the real precision of the
  measurement is lossy in a controlled way and is the biggest single lever on
  size. Record it in the metadata.
- **Test over HTTP with the real reader.** Open the published URL with xarray,
  rioxarray, or GeoPandas and watch the request count. A layout that works
  locally can still fetch everything when read remotely.

### COG

- **Tile size.** GDAL's default of 512 x 512 suits analytical rasters read in
  windows; 256 x 256 suits web maps. Either is fine, but keep one size across a
  collection.
- **Predictor.** `PREDICTOR=2` for integer data and `PREDICTOR=3` for floats
  stores the differences between neighbouring pixels rather than the values,
  which compresses smooth fields such as climate surfaces much better. Set it
  every time.
- **Sparse tiles.** `SPARSE_OK=YES` makes tiles that are entirely nodata take no
  space, which matters for land-only rasters and masked regions.
- **Interleave.** `INTERLEAVE=PIXEL` (the default) when bands are read together;
  `INTERLEAVE=BAND` when people pick single bands. Variables that are never read
  together belong in separate files.
- **Overviews.** They are built by default. Match the resampling to the data,
  `NEAREST` or `MODE` for classes and `AVERAGE` for continuous values, so a
  zoomed-out view does not invent values that do not exist.
- **Metadata inside the file.** Set `nodata`, the CRS, scale and offset for
  packed data, and `STATISTICS=YES` so readers can stretch and mask without a
  full read.

### Zarr

- **Chunk for the questions.** Map chunks, series chunks, or a balance, as in
  the [cube comparison](#cubes). When a dataset serves both kinds of user, a
  balanced shape such as 60 time steps over 32 x 32 pixels keeps both reads to a
  handful of requests. Whatever you choose, document it in the record.
- **Chunk size.** Aim for 1 to 10 MB uncompressed per chunk. Hundreds of tiny
  chunks per read are slower than one larger one, even if more bytes come down.
- **Sharding.** Zarr v3 shards pack many small chunks into one object, so a
  series-friendly chunking no longer means millions of files in storage. Use it
  for large stores with small chunks.
- **Compressor.** Blosc with zstd, level 3 to 5. Use `bitshuffle` for packed
  integers and `shuffle` for floats. The shuffle lines up bytes or bits across
  values so zstd can find the repetition.
- **Pack floats.** `dtype: int16` with `scale_factor` and `add_offset` when the
  precision is fixed, plus an explicit `_FillValue`. This was the largest single
  saving in the cube comparison.
- **One store, consolidated.** Put variables that share a grid in one store with
  one-dimensional coordinate arrays, and write consolidated metadata so a reader
  can open the dataset in one request. Dimension order `(time, y, x)` and CF
  attributes make it work in xarray and GDAL without extra setup.

### Parquet and GeoParquet

- **Types first.** Integers as integers, codes and names as dictionary-encoded
  strings (the default), dates as date or timestamp types rather than strings,
  booleans as booleans, and float32 where the precision allows. A column that
  mixes strings and numbers forces the widest type and defeats everything that
  follows.
- **Row group size.** Smaller groups skip more precisely on a filter; larger
  groups mean fewer reads for a scan. Between 50,000 and a few hundred thousand
  rows, or 10 to 100 MB, suits most Hub tables. The pandas default of one
  million rows gives a small table a single group and nothing to skip.
- **Sort for the filter.** Sort by the columns people filter on, so matching
  rows share row groups and the statistics can rule out the rest. For spatial
  data, sort along a Hilbert curve or with GDAL's `SORT_BY_BBOX=YES`, and write
  the covering bounding-box column.
- **Encodings.** Dictionary encoding is on by default and is why repeated codes
  cost almost nothing. For float columns, `use_byte_stream_split=True` is the
  Parquet equivalent of a shuffle and helps zstd a lot.
- **Partition only when everyone filters that way.** Splitting a table into
  files by country or year helps if every query starts there, and hurts if it
  leaves thousands of tiny files. Keep each file above a few tens of megabytes.
- **GeoParquet specifics.** Geometry as WKB, the CRS in the file metadata, the
  geometry column last so attribute-only reads stay cheap, and the bounding-box
  column so spatial filters can skip row groups (`write_covering_bbox=True` in
  GeoPandas, on by default in recent GDAL).

## Before you publish

- **Check the output.** Validate COGs with `rio cogeo validate`. Open Zarr
  stores with the intended reader and inspect the metadata and chunks; pass
  `consolidated=True` when the store has consolidated metadata. Inspect Parquet
  metadata with `pq.ParquetFile(...).metadata`.
- **Check partial access.** Try a typical spatial, temporal, or column selection
  through the published URL to confirm that the layout and hosting support the
  intended reads.
- **Include the metadata needed to use the data.** Record missing values, units,
  CRS, and relevant statistics inside the files or stores.
- **Document layout choices.** Explain the chunking or row-group layout and the
  access patterns it supports. Use the catalog's fields or linked documentation,
  with `note` for limitations users need to know about.

For Zarr writing options, including metadata consolidation, see the
[xarray documentation](https://docs.xarray.dev/en/stable/generated/xarray.Dataset.to_zarr.html).
The [tutorials](/tutorials/) show how to work with Hub data.

## Further reading

- [Cloud-Native Geospatial Guide](https://guide.cloudnativegeo.org/)
- [Cloud-native geospatial zine](https://zines.developmentseed.org/zines/cloud-native/)
- [COG spec](https://cogeo.org/),
  [Zarr spec](https://zarr-specs.readthedocs.io/),
  [GeoParquet spec](https://geoparquet.org/)
