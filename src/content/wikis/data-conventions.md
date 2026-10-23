---
title: Data conventions
description: How Hub-hosted data is named, laid out, and versioned in the bucket.
group: Data standards
updated: 2026-10-20
order: 1
---

The Hub brings together climate and climate-adjacent datasets produced by CGIAR
and partner organizations, alongside external datasets widely used by the
research and data community. Users can discover these datasets through a shared
catalog, which describes their content, availability, and how to access them.

Data may be hosted directly by the Hub or accessed through an external provider.
In both cases, the Hub provides consistent metadata to help users understand and
use the data.

## The Hub's Federated Approach

Data in the Hub is managed and cataloged using a federated approach, where
datasets can remain with their providers and are made discoverable through a
shared metadata catalog.

This includes two categories:
- Hub-hosted data: datasets hosted and managed by the Hub.
- Externally hosted data: datasets hosted and managed by external providers, but
  cataloged by the Hub.

Both are described through a single, harmonized metadata layer (see
[Metadata Conventions](/wikis/metadata-conventions/)). This provides a
consistent way to discover datasets, understand their content, and identify how
to access and use them, regardless of how and where they are stored.

This approach allows the Hub to bring together data from multiple providers
without having to host and maintain every dataset itself. Data can remain with
the organizations responsible for producing and updating it, while the Hub
maintains a shared catalog for discovery and access.

### To Host or Not to Host

The Hub aims to make climate data as accessible as possible, including datasets
produced by CGIAR and partner organizations, as well as external datasets widely
used by the research and data community.

The Hub hosts many datasets produced by teams within CGIAR and partner
organizations. This helps make data available beyond personal laptops, internal
servers, and individual project sites or pipelines, providing a shared location
where others can discover and access it.

Where internal or external datasets are already readily available in formats
suitable for modern data analysis pipelines, the Hub can catalog and link
directly to them.

Where access could be improved, the Hub may create and host analysis-ready,
cloud-optimized (ARCO) copies. Formats such as Zarr, Cloud Optimized GeoTIFF,
and Apache Parquet support efficient access, allowing users to read relevant
portions of a dataset without downloading it in full. See
[Cloud-optimizing data](/wikis/cloud-optimizing-data/) for more information.

The Hub may also provide virtual access layers, such as GDAL GTI/VRT or virtual
Zarr stores using Icechunk, that reference existing files without creating full
copies. These layers can present thousands of individual files or tiles as a
single dataset, simplifying access while limiting data duplication.

Virtual access layers depend on the source files remaining available and
unchanged. Changes to the underlying data or its location may break the layer
and should be addressed as soon as possible.

Decisions to host, copy, transform, or redistribute data must follow the
governance policy’s [Licensing](/wikis/governance/#licensing) requirements.
Responsibilities for the source data, hosted copies, and ongoing maintenance are
described under [Resource classes](/wikis/governance/#resource-classes).

## Restricted and embargoed data

All metadata published through the Hub must be publicly accessible, including
records describing restricted or embargoed datasets. This applies to both
Hub-hosted and externally hosted datasets. The underlying data can remain
subject to access restrictions.

Public metadata allows users to discover that a dataset exists, understand its
content, and determine how to obtain access. This supports the FAIR principles
by making datasets discoverable and providing the information needed to
understand, access, and reuse them. Data does not have to be openly available to
be FAIR, but its content, provenance, access conditions, and terms of use should
be clearly described.

For restricted or embargoed datasets, the metadata must explain the access
conditions and, where applicable, how to request access and who to contact. Any
embargo period should also be recorded. This makes the dataset discoverable and
provides a clear route to requesting access while respecting restrictions on the
data itself. For more information, please see
[Governance — FAIR Alignment](/wikis/governance/#fair-alignment).

---

## Data Storage Conventions

These conventions apply to data hosted by the Hub where the Hub controls the
storage layout and output formats. They define how datasets are named,
organized, versioned, and documented so they remain consistent and easy to
access and use.

Externally hosted datasets follow their providers’ conventions. Where the Hub
creates a hosted copy or virtual access layer, these conventions apply to the
outputs it creates.

## Naming

Names should be short, descriptive, unique within the Hub, and URL-safe.

Use lowercase names without spaces, following these conventions:
1. Dataset IDs and folder names: kebab-case. Examples: `mapspam-2020`, `cog`.
2. Filenames: hyphens between fields, underscores within fields. Examples:
   `crop-codes.json`, `glw4-2020.zarr`, `spam2020-physical_area-all.tif`.
   Preserve identifiers such as physical_area when including them in filenames.
3. Identifiers within the data: snake_case. Use snake_case for layer names,
   variables, dimensions, coordinates, attributes, and JSON keys. Examples:
   physical_area, crop_name. Preserve names required by the relevant format or
   metadata standard. This is a CF convention, and it works unquoted in Python
   and R.

CamelCase should be avoided. Keep the source's stable codes as the
machine-facing values (SPAM crop codes like `whea`, `pige`) and carry readable
names alongside as labels (`crop_name` coord, `long_name` band tag,
`*-codes.json`). Every asset of a dataset uses the same code vocabulary.

## Storage Layout

Group each dataset release under a shared prefix, using the catalog record’s
`id` and `version`:

```text
cdh/data/<cdh_id>/<release>/
```
Keep all assets and supporting files for a dataset release under a single
prefix. This simplifies management, copying, versioning, and deletion by keeping
the release together. Within that prefix, organize assets according to their
content and format. Virtual access layers may reference source data stored
elsewhere.

The following illustrates possible assets; datasets do not need to provide every
format or follow these exact names:

```text
cdh/data/<cdh_id>/<release>/
  <name>.zarr/
  <name>.icechunk/
  <name>.parquet
  <name>-partitioned.parquet/
    year=2020/
      crop_code=whea/
        part-0.parquet
  cog/
    <name>-<field>.tif
  crop-codes.json
```
General Guidelines:
- **Use descriptive asset names.** Using the dataset ID is a useful default, but
  names can also distinguish variables, subsets, or other groupings within a
  dataset.
- **Use format suffixes for directory-based datasets.** Prefer `.zarr/`,
  `.icechunk/`, and `.parquet/` to make their format clear, even though they
  contain multiple objects.
- **Preserve format-specific internal structures.** Naming conventions apply to
  the dataset’s root name and other Hub-defined paths. Internal files, keys, and
  partition directories follow the conventions of the format or software that
  writes them. Hive-style partitions use `key=value/`, with snake_case for
  partition field names.
- **Keep release assets together where practical.** Store data assets and
  supporting files under the release prefix.
- **Describe each asset in the catalog.** A release may contain multiple formats
  or subsets; the catalog identifies what each asset contains and how to access
  it.

## Versioning

Each dataset release is stored under a separate prefix. The dataset ID and
release version correspond to those recorded in the catalog. Releases should sit
side by side:

```
cdh/data/climate-2020/v2r2/
cdh/data/climate-2020/v2r3/
```

Every dataset must have a version, even if it has only one release. Use the
producer’s version string where available. Otherwise, assign `1` to the first
release and increment it to `2`, `3`, and so on for subsequent source-data
releases. Document that the version was assigned by the Hub and record the
source retrieval date separately.

Changes to published values, coordinates, units, missing-data interpretation,
coverage, methodology, or structure that could affect users’ results or
interpretation require a new release, including corrections to pipeline errors.
Publish these changes under a new release prefix; do not overwrite the previous
release. See
[Governance — Lifecycle and Maintenance](/wikis/governance/#lifecycle-and-maintenance).

When Hub processing changes the data without a new source version, append an
incrementing Hub revision suffix to the source version, beginning with `-cdh.1`.
For example, `v2r2` becomes `v2r2-cdh.1`, or `1` becomes `1-cdh.1`. Record the
source version, processing code revision, publication date, and a summary of the
changes in the catalog and output metadata.

Storage-only changes, such as different compression or chunk layouts, may
replace an existing asset if the decoded values, interpretation, and supported
access remain unchanged. Record the processing revision, replacement date, and
changes in the catalog and output metadata. Users must not encounter a mixture
of old and new files during replacement.

Documentation and descriptive metadata corrections may be made in place when
they do not change the data or its interpretation. Keep their revision history
in version control.

Resolve the current release through the catalog. Avoid a separate latest/ copy
or alias in storage. The catalog identifies the current release and links to its
assets.

## Metadata Within Data Files

Include metadata within data files and stores so users and software can
interpret them independently of the Hub catalog. Follow the standards and
conventions appropriate to the data type and format.
- Climate and Forecast (CF) conventions: Use CF conventions for multidimensional
  climate data where applicable, including NetCDF and Zarr outputs. Describe
  variables using long_name, appropriate units, and a valid CF standard_name
  where one exists. Include coordinate information, calendars, missing-value
  conventions, and, where relevant, cell bounds and cell_methods to explain
  spatial or temporal aggregation.
- Geospatial conventions: Preserve the information needed to locate and
  interpret the data, including coordinate reference systems and spatial
  referencing. For Zarr outputs, adopt relevant GeoZarr conventions where
  supported by the tools used to produce and read them. For vector data stored
  in Parquet, follow the GeoParquet specification.
- Provenance: Record the source dataset and version, processing history, and the
  recipe or code revision used to produce the output.
- Statistics: Include useful format-specific statistics, such as COG band
  statistics and Parquet column statistics, where appropriate.
- Supporting lookups: Provide code-to-name tables and other supporting files
  alongside the data, preferably as JSON at the release prefix root. Generate
  these through the recipe to keep them consistent with the outputs.

Record the versions of the standards and conventions applied, using their
prescribed metadata fields where available.
