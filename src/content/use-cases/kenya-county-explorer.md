---
title: Kenya County Explorer
kind: Impact
partner: RCMRD · KIPPRA · Alliance
sector: Adaptation planning
country: Kenya
description: A county-level climate explorer used by twelve Kenyan counties to align development plans with climate evidence.
impact:
  - 12 counties using the explorer in 2026 planning
  - 3 county development plans revised with hazard layers
  - $140M of investments informed
datasets: [glw4-2020, spam2020]
date: 2026-03-15
featured: true
---

County governments in Kenya write five-year County Integrated Development
Plans (CIDPs), and most of them are written without spatially explicit climate
evidence. The County Explorer set out to change that: a lightweight web tool
that puts harmonised hazard, production, and livestock layers in front of
county planners.

## The problem

Climate data existed for every one of these counties — but scattered across
portals, formats, and licences. Planners told us the blocker wasn't
availability, it was assembly: pulling ten sources into one defensible
picture takes weeks of GIS work each planning cycle.

## What was built

The explorer streams Hub-hosted layers directly, clipped to county boundaries,
with plain-language summaries generated from the metadata records.

### The data layers

Crop production from MAPSPAM, livestock densities from GLW4, and hazard
surfaces — all pulled straight from the Hub's cloud-native stores, so the
tool ships no data of its own.

### Metadata doing the talking

Because every layer carries CDH metadata, the tool shows provenance and
appropriate-use guidance inline — planners see where a number comes from
and what it shouldn't be used for, without leaving the map.

## What changed

Twelve counties used the explorer in their 2026 planning cycles. Three revised
their CIDPs with hazard overlays, redirecting drought-resilience investment
toward the wards where exposed livestock and cropland actually concentrate.

## What made it work

The counties didn't adopt a data portal — they adopted answers. The lesson for
the Hub: harmonised metadata isn't bureaucracy, it's what lets a small team
build decision tools quickly on top of many datasets.
