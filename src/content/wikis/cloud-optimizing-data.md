---
title: Cloud-optimizing data
description: How cloud-optimized formats save downloads and storage, and how to choose a layout that suits the way people use your data.
group: Data standards
updated: 2026-10-27
order: 3
---

The Hub aims to make analysis-ready, cloud-optimized (ARCO) data available
wherever that is practical and useful. Formats such as Cloud Optimized GeoTIFF,
Zarr, and GeoParquet let people read the parts of a dataset they need without
downloading the rest. This saves time and bandwidth when working with large
climate and agricultural datasets, especially if an analysis only needs one
region, a few variables, or a particular period.

## Data as the API

The Hub does not provide one API for every dataset. Instead, it follows the idea
that the data itself should be the API: well-described files that people and
tools can open directly. A [metadata record](/wikis/metadata-conventions/)
describes the dataset and links to its files. A reader then requests the chunks
it needs, or uses HTTP range requests to read selected parts of a file.

This means data can be served from standard web or object storage without a
dedicated API server for each dataset. People can keep using the tools they
already know, such as GDAL, xarray, terra, and DuckDB, or browser libraries that
support the format. Storage and access still have to be maintained, but most of
the work of selecting and reading data happens in users' own tools.

Datasets hosted elsewhere may already provide suitable files or APIs. The Hub
can link to those directly, or prepare an ARCO copy where that would improve
access. The [data conventions](/wikis/data-conventions/) explain when the Hub
hosts data and how its files are organized.

## Why cloud optimization matters

If you need rainfall for a few farms or survey results for one country,
downloading the entire dataset can take much longer than the analysis itself.
Cloud-optimized files let compatible tools read just the parts you need from the
source. This makes queries faster, uses less memory and disk space, and avoids
keeping large local copies when you only need a small part of the data.

These formats build on established tools and conventions. They support partial
reads in different ways: COG organizes a GeoTIFF into internal tiles and
overviews, Zarr splits multidimensional arrays into separately stored chunks,
and Parquet stores tables column by column in row groups that a query can skip.
GeoParquet adds a standard way to store geometries in Parquet. Each tile, chunk,
or column is compressed on its own, so files stay small and a reader can fetch
and decompress only the parts it needs.

Partial reads are the first step. The same property, files any tool can open in
place, means the analysis can run next to the data instead of on a laptop: a
cloud notebook, a Dask cluster, or compute instance in the same region as the
storage. The Hub keeps this open on purpose: the data is not tied to any one
compute platform, so it works with whatever you have, from a laptop to a cluster
beside the files.

## What makes a file cloud-optimized

To read part of a dataset remotely, a tool needs to know where that data is
stored and be able to download it separately. This requires:
1. **Independently readable sections.** Tiles, chunks, or column chunks within
   row groups let a reader retrieve selected parts of a dataset.
2. **Metadata that locates the data.** Headers, chunk metadata, and footers say
   where everything is, so a reader can find the parts it needs.
3. **Overviews or statistics where supported.** Lower-resolution overviews
   support map previews, and statistics let readers skip sections that cannot
   match a query.

The catalog metadata helps people find the right dataset. The metadata inside
each file then helps their tools find and read the parts they need.

## The formats

Choose a format based on the structure of the data, the tools that will read it,
and how people are likely to access it. These are the main formats used by the
Hub.

### Rasters: COG

A Cloud Optimized GeoTIFF (COG) arranges raster data in tiles, with metadata
positioned so a reader can locate it efficiently. Overviews provide
lower-resolution versions for displaying larger areas. Readers that support
remote access fetch only the tiles or overview they need, and the file is still
an ordinary GeoTIFF for everything else. See the
[GDAL COG documentation](https://gdal.org/en/stable/drivers/raster/cog.html).

Include the missing-value indicator (`nodata`), coordinate reference system
(CRS), and any scale or offset in the file so readers can interpret the values.
The creation options worth tuning, such as sparse tiles, the predictor, and the
tile size, are covered under [Doing it well](#cog). Layers that are accessed on
their own are best as separate COGs; a multi-band COG suits bands that are
usually read together.

### Cubes: Zarr

Zarr stores multidimensional arrays in compressed chunks and is designed to work
directly with cloud object storage. It suits climate datasets with space, time,
model, and scenario dimensions. Tools such as xarray and Dask can download and
process chunks as needed, including several at once, without loading the whole
dataset. This supports analysis of datasets larger than the available memory or
local disk. See the
[xarray Zarr documentation](https://docs.xarray.dev/en/stable/user-guide/io.html#zarr).

Include Climate and Forecast (CF) metadata such as `units`, `long_name`, and a
valid `standard_name` where one exists.
[GeoZarr](https://github.com/zarr-developers/geozarr-spec) provides conventions
for geospatial metadata; use them where the tools producing and reading the data
support them. Choose chunk shapes for the way people will use the data: maps,
time series, or a mix of both.

### Tables: Parquet

Parquet stores tables column by column in groups of rows. Compression and
dictionary encoding reduce file size, particularly for repeated codes and names.
Each column within a row group can be read separately, so tools can download the
parts an analysis needs without loading the whole table.

Readers can also use statistics to skip row groups that do not match a filter.
Sorting by commonly filtered fields, such as country and year, makes this more
effective. Tools such as DuckDB select columns and skip irrelevant row groups
[automatically](https://duckdb.org/docs/stable/data/parquet/overview.html#partial-reading).

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
  when a store is updated over time. Think Git commits but for data.
- **VirtualiZarr and kerchunk** give virtual access to existing files, such as
  NetCDF or GeoTIFF, without making a full copy of the data.
- **FlatGeobuf** supports efficient access to vector features and suits
  applications such as browser maps.
- **PMTiles** packages map tiles for direct access, useful when a dataset needs
  a map viewer.

## What this means in practice

Four common jobs, and what each costs from a classic file versus a
cloud-optimized one. The numbers come from published benchmarks, linked in each
case. Your own results will depend on the chunking, the connection, and the
tool, so treat them as the order of magnitude, not a promise.

**You want to look at a global raster, then clip out one country.** From a
GeoTIFF stored in strips, both reads pull most of the file. The zoomed-out view
needs every pixel, and the country window needs every full-width row that
crosses it. From a **COG**, the map view reads one overview and the clip reads
the tiles over that country. Opening the file is a single 16 KB request, and a
tile costs about three range requests
([tilebench](https://github.com/developmentseed/tilebench)). The full-resolution
data is still there in the same file when you need it. The
[COG guide](https://cogeo.org/in-depth.html) explains how it works.

**You want 40 years of daily rainfall at six farms.** A NetCDF archive is
usually hundreds of files, each chunked as maps, so your tool has to open every
file and read a chunk from each. AWS measured this on ERA5: a 13-year point
series took 193 seconds from NetCDF and under 5 seconds from **Zarr** rechunked
for time series. Rechunking MERRA-2 the same way took a query from one or two
minutes to under a second
([AWS, 2023](https://aws.amazon.com/blogs/publicsector/decrease-geospatial-query-latency-minutes-seconds-using-zarr-amazon-s3/)).
The format was not the main difference. The chunk shape was, and Zarr makes it
easy to choose and to read many chunks at once. NetCDF read with the right
library over object storage can get close
([Penard et al., 2026](https://gmd.copernicus.org/articles/19/1519/2026/)), but
most tools do not read it that way by default. Either way, you can work with a
dataset far bigger than your laptop can store.

**You want the mean of one column from a survey, or everything for Kenya in
2020.**
From a CSV, both reads are the whole file. **Parquet** stores each column
separately and keeps min and max values per row group, so one column costs one
column, and a file sorted by country and year lets the reader skip every row
group that cannot match. On 11 million taxi rows, zstd Parquet was 6.8 times
smaller than the CSV and a single-column query ran about 60 times faster
([MotherDuck](https://motherduck.com/learn/csv-vs-parquet-benchmark/)). Those
timings were on a local disk. Over HTTP the gap is the download itself, which is
larger. Survey data usually compresses better than taxi data, because most
answers repeat.

**You want the names of every district, or the features around one site.** From
a GeoPackage, listing names reads nearly the whole file, geometry and all.
**GeoParquet** keeps the name column apart from the geometry, so that read is a
few hundred kilobytes. On 10 million AIS points, GeoPackage was 2.6 GB and
GeoParquet 470 MB; a full read took 2 minutes 12 seconds versus 7 seconds, and 4
seconds with only some columns selected
([Graser, 2024](https://anitagraser.com/2024/11/23/geoparquet-in-qgis-smaller-faster-files-for-the-win/)).
For the area query, sort nearby features together and write the bounding-box
column so readers skip row groups outside it. Shapefile is not in the running at
this size: converting a 22 GB CSV to GeoParquet took under 5 minutes, to
GeoPackage over 2.5 hours, and the Shapefile write failed at its 2 GB limit
([Cloud-Native Geospatial, 2023](https://cloudnativegeo.org/blog/2023/08/performance-explorations-of-geoparquet-and-duckdb/)).

## Doing it well

Start with the questions people will ask of the data, then try those reads with
the tools they use. The choices below are useful starting points; adjust them
when the dataset or its readers need something different.

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
  that are too small require many separate requests. Large ones mean downloading
  more unwanted data with each read. Between 1 and 10 MB compressed is a good
  range.
- **Record any rounding.** Rounding to the precision of the measurement can
  substantially reduce file size. It changes the stored values, so document the
  precision used in the metadata.
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

- **Chunk for the questions.** Long stretches of time over small spatial areas
  suit point histories; short stretches over larger areas suit maps. If people
  need both, try a compromise and check both kinds of read. Document the choice
  in the record.
- **Chunk size.** Aim for 1 to 10 MB uncompressed per chunk. Hundreds of tiny
  chunks can take longer to read than a larger chunk, even if the larger chunk
  contains more data. The
  [Zarr performance guide](https://zarr.readthedocs.io/en/latest/user-guide/performance/)
  covers chunking, sharding, and compressor trade-offs in more depth.
- **Sharding.** Zarr v3 shards pack many small chunks into one object, so a
  small chunks for time series do not require millions of separate files. Use it
  for large stores with small chunks.
- **Compressor.** Blosc with zstd, level 3 to 5. Use `bitshuffle` for packed
  integers and `shuffle` for floats. The shuffle lines up bytes or bits across
  values so zstd can find the repetition.
- **Pack floats.** `dtype: int16` with `scale_factor` and `add_offset` when the
  required range and precision fit, plus an explicit `_FillValue`. Smaller types
  reduce storage and the amount of data readers need to decompress.
- **One store, consolidated.** Put variables that share a grid in one store with
  one-dimensional coordinate arrays, and write consolidated metadata so a reader
  can open the dataset in one request. Dimension order `(time, y, x)` and CF
  attributes make it work in xarray and GDAL without extra setup.

### Parquet and GeoParquet

- **Types first.** Integers as integers, codes and names as dictionary-encoded
  strings (the default), dates as date or timestamp types rather than strings,
  booleans as booleans, and float32 where the precision allows. A column that
  mixes strings and numbers can require a less efficient storage type.
- **Row group size.** Smaller groups skip more precisely on a filter; larger
  groups mean fewer reads for a scan. Between 50,000 and a few hundred thousand
  rows, or 10 to 100 MB, suits most Hub tables. The pandas default of one
  million rows gives a small table a single group and nothing to skip.
- **Sort for the filter.** Sort by the columns people filter on, so matching
  rows share row groups and the statistics can rule out the rest. For spatial
  data, sort along a Hilbert curve or with GDAL's `SORT_BY_BBOX=YES`, and write
  the covering bounding-box column.
- **Encodings.** Dictionary encoding is on by default and reduces the space
  needed for repeated codes. For float columns, `use_byte_stream_split=True` is
  the Parquet equivalent of a shuffle and can improve zstd compression.
- **Partition only when everyone filters that way.** Splitting a table into
  files by country or year helps if every query starts there, and hurts if it
  leaves thousands of tiny files. Keep each file above a few tens of megabytes.
- **GeoParquet specifics.** Geometry as WKB, the CRS in the file metadata, the
  geometry column last to keep attribute-only reads efficient, and the
  bounding-box column so spatial filters can skip row groups
  (`write_covering_bbox=True` in GeoPandas, on by default in recent GDAL).

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
