---
title: Metadata Conventions
description: How shared metadata supports the Hub's federated approach, data discovery, and analysis.
group: Data standards
updated: 2026-10-23
order: 2
---

Metadata is the core of the Hub as the shared layer that brings all of the
datasets together. Whether data is hosted by the Hub or an external provider,
each dataset is described through a common metadata standard. These records
allow people and software to discover datasets, understand their content, and
identify how to access and use them.

This provides a consistent way to discover datasets, understand their content,
and access them, regardless of where the underlying data is stored. The catalog,
data access tools, and analysis workflows can all work from these records. See
[Data conventions](/wikis/data-conventions/) for more about the Hub's approach
to hosting and accessing data.

Each dataset is cataloged as a YAML record describing its content, coverage,
provenance, license, and access options, including links to its data assets.
This provides a consistent description of data stored in different locations and
formats without requiring it to be hosted in one place. Users should be able to
understand what a dataset contains, assess its suitability, and find out how to
use it from the metadata before downloading it.

This page explains the Hub’s metadata conventions and why they are used. The
Metadata Standard defines the fields and requirements for a record.

> **NOTE:** For help creating and submitting one, see
> [Authoring a metadata record](/tutorials/authoring-a-metadata-record/).

## Why a shared metadata standard

The Hub needs metadata that is easy to write, read, and validate, and that can
describe the different resources included in the catalog. Using a shared
standard means users and tools can find the same types of information in
consistent fields, reducing the need to interpret each dataset's own
documentation separately.

The Hub uses the
[CDH metadata standard](https://github.com/CGIAR-Climate-Data-Hub/cdh-metadata-standard)
to structure its catalog records. Records are written in YAML to make them easy
for people to edit and for software to read. A schema is used to validate their
structure, required fields, and permitted values.

The standard covers datasets, software, services, and documents. Many of its
fields are drawn directly from STAC, DCAT, Frictionless Data, and OGC API
Records. It provides a common authoring format from which records can be mapped
and published to the community standard most appropriate to each resource type.
This allows metadata authored for the Hub to be used by other community tools
and catalogs.

## Working with metadata before data

Metadata should allow users and tools to find and select data before opening the
files. Records should describe coverage, resolution, variables, units, formats,
and limitations so users can assess whether a dataset meets their needs.

Analysis workflows can then use the links in the metadata to access the data,
reading only the relevant area or time period where the format supports it.
Workflows should select and record the dataset version used so later updates do
not silently change their inputs.

## Metadata design principles

The metadata fields were chosen to help people and tools understand the data,
reuse it appropriately, and find resources that meet their needs.

### Readable and understandable by people and machines

The same metadata should be useful to someone browsing the catalog, a script
accessing data, or an AI agent helping with an analysis. Clear descriptions
explain what a dataset represents and how it can be used. Structured fields
allow software to work with information such as coverage, units, and access
conditions directly.

Fields such as `note` and the usage guidance in `cdh.usage` help explain known
biases, limitations, and situations where the data should not be used. These
fields can also point users to more suitable alternatives. For example,
explaining that a dataset is too coarse for field-level decisions helps both a
person and an AI agent avoid using it at the wrong scale.

### Supporting FAIR data and reuse

The Hub's metadata supports the
[FAIR principles](https://www.gofair.foundation/fair-principles): making data
Findable, Accessible, Interoperable, and Reusable. Stable identifiers and
versions identify the resource being used, while provenance records where it
came from and how it was processed. Shared fields and vocabularies help other
tools interpret the same information consistently.

Licenses and access conditions explain how data can be obtained and reused.
Citation and attribution fields explain how to acknowledge its producers, and
contacts identify who to ask for help. These details should be available in the
record so users can understand the conditions attached to the data before using
it.

All Hub metadata must be public, including records for restricted or embargoed
data. These records must explain the access conditions, any applicable embargo,
and how to request access or who to contact. Publishing metadata does not change
the data's terms of use. Records should remain available if the data is
withdrawn or becomes unavailable, with their status updated to explain what has
changed. See [Governance — FAIR Alignment](/wikis/governance/#fair-alignment).

### Discoverable and searchable

Discovery fields help users find relevant data across the catalog. Titles,
descriptions, and keywords support text searches, while domains group resources
by subject. Other fields, such as bbox, geography, temporal coverage, and
commodities, are intended to allow users to search and filter datasets quickly
based on their needs.

Having these as structured fields, rather than being buried in descriptions or
other text fields, allows easy filtering by humans and machines without having
to extract the information from prose. Further, controlled vocabularies and
strict structures give these fields consistent values so the same subject is not
split across different spellings or labels. Keywords allow additional search
terms, such as common names, abbreviations, or methods.

Together, these fields allow people and tools to narrow a search before
inspecting individual datasets. A search for maize projections in a particular
region, for example, can use the commodity, location, scenario, and time period
described in the metadata.

## Keeping records current

The metadata record should be updated and aligned with changes to the data,
location, access conditions, license, and availability. Metadata corrections are
tracked through version control; changes to the underlying data follow the
[data versioning conventions](/wikis/data-conventions/#versioning).
