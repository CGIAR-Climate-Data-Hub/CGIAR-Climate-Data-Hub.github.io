---
title: Architecture
description: How the Hub is put together — the metadata layer, cloud-native distribution, the build pipeline, and the machine interfaces every page exposes.
section: Concepts
updated: 2026-07-27
order: 1
---

<!-- Technical blueprint deliverable. Keep this page the single source of truth
     for how the Hub is built; link to the wikis that go deeper rather than
     restating them here. -->

The Hub is a static site over a versioned metadata catalog, with the data itself
living in object storage and read directly by clients. This page describes each
layer and how they fit together.

## System overview

<!-- Drop the diagram here. Raw HTML works in .md, so either inline the SVG:
       <figure><svg viewBox="0 0 …" role="img" aria-label="…">…</svg>
       <figcaption>…</figcaption></figure>
     or reference a file beside this one:
       ![Hub architecture](./architecture.svg)
     Rename this file to .mdx if you'd rather import a diagram component. -->

## The metadata layer

<!-- CDH record schema, the STAC profile, what review a record passes before
     publication, how records relate to STAC items. -->

## Data storage and distribution

<!-- Object storage, the cloud-native formats (COG, Zarr, Parquet) and why
     each is used, subsetting/streaming instead of bulk download. -->

## Build pipeline

<!-- records repo → build-time fetch → static output; the repository_dispatch
     rebuild trigger; where the skills collection comes in. -->

## The site layer

<!-- Why static, and why Astro: no server or database to operate, the whole site
     is a build artifact on GitHub Pages; catalog and skills are fetched from
     their source repos at build time, so the metadata has one home; ships zero
     JavaScript by default, which is what keeps the pages fast and readable by
     anything that fetches them; content collections give the schema validation
     the deliverable relies on, and MDX is there when a page needs components.
     Note what this rules out too — no server-side search or per-user state —
     and why that trade was acceptable. -->

## Machine interfaces

<!-- The AI-readiness posture, not just the endpoint list: HTML for people,
     with a machine counterpart for every page rather than a separate API to
     keep in sync — markdown twins, llms.txt / llms-full.txt, catalog.json and
     per-record JSON, schema.org JSON-LD, the RFC 9727 api-catalog for
     discovery, Content Signals in robots.txt. Say what a static host can't do
     here (content negotiation, Link headers) and what that would take.
     Link to /ai/ rather than duplicating its endpoint table. -->

## Agent skills

<!-- Why skills rather than a bespoke integration: the open Agent Skills format
     is plain-text instructions any assistant can load — Claude Code, Gemini
     CLI, Codex, OpenCode read the same folder — so the Hub publishes its
     workflows once instead of per-vendor. Cover where they live (their own
     repo, fetched at build time), the discovery index with sha256 digests
     agents verify before installing, and what a skill is expected to teach
     that documentation alone doesn't. -->

## Versioning

<!-- Field-based versioning: version, previous_version, deprecated — and why
     folder layout is never used to infer a version. -->

## Repositories

<!-- What lives where across the GitHub org, so a reader can find the source
     for any layer above. -->
