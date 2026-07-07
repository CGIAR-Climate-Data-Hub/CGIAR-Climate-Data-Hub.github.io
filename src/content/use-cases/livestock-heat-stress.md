---
title: Mapping livestock exposure to heat stress
kind: Impact
partner: FAO · Alliance
sector: Livestock
country: East Africa
description: GLW4 livestock densities combined with heat-stress projections to target adaptation finance across East African rangelands.
impact:
  - Exposure maps for 6 species across 7 countries
  - Adopted in one regional adaptation investment plan
datasets: [glw4-2020]
date: 2026-05-20
---

Heat stress is already cutting milk yields and fertility across East African
rangelands, but adaptation finance has been allocated with little information
about *where* exposed animals actually are.

## The approach

The team combined [GLW4 gridded livestock densities](/catalog/glw4-2020) with
downscaled temperature-humidity projections to map, species by species, where
heat-stress days will intersect with dense livestock populations by 2030.

Because GLW4 ships as an analysis-ready Zarr cube with an explicit species
dimension, the exposure analysis ran per species without any data wrangling —
the same notebook produced maps for cattle, goats, sheep, and chickens.

## Handling the caveats

GLW4 values are modelled densities, not counts — the record's own guidance
warns against naive aggregation on a lat/long grid. The team followed the
recommended equal-area weighting, and validated national totals against
census figures before publishing.

## Outcome

The exposure maps now sit under a regional adaptation investment plan,
directing shade, water, and breed-improvement interventions to the highest
exposure rangelands rather than being spread evenly.
