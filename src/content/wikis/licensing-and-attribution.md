---
title: Licensing and attribution
description: Permitted licences, attribution requirements, and DOI policy for Hub datasets.
section: Governance
updated: 2026-04-02
---

The Hub only publishes data that can be legally redistributed and reused. This
page sets out what licences are accepted and how attribution works.

## Permitted licences

- **CC-BY-4.0** — preferred for new contributions
- **CC-BY-SA-4.0** — accepted; note the share-alike obligation propagates
- **CC0 / Public Domain** — accepted
- Custom or non-commercial licences are **not** accepted; talk to the
  maintainers if your source data is restricted.

The licence in the metadata record is an SPDX identifier and applies to the
distributions listed in the record, not to third-party source data, which
retains its own terms.

## Attribution

Reusers must cite the dataset as given in the record's `citation` block. Every
dataset page renders a copy-ready citation. When a dataset is derived from an
external source (for example FAO or IFPRI data), the original providers stay
listed as `licensor`/`producer` contacts and must be credited alongside the
Hub.

## DOIs

Datasets processed and published by the Hub get a DOI minted on publication.
Datasets that already carry a DOI from their original publisher (for example
Harvard Dataverse deposits) keep it — the record's `doi` field always points
at the citable identifier.
