---
title: Cloud-optimizing data
description: Converting rasters to COG and cubes to Zarr so Hub datasets can be read by range request — the layout conventions, the tooling, and how to validate the result.
group: Data standards
updated: 2026-08-25
order: 2
soon: true
---

The Hub distributes data in formats that can be read **without downloading the
whole file**. A client issues HTTP range requests for the bytes covering its
area or time slice. That single property is what makes the catalog's code
examples one-liners instead of download scripts, and it is why format conversion
is a submission requirement rather than a nicety.
