---
title: Hub architecture
description: How the Hub is put together — the metadata layer, cloud-native distribution, the build pipeline, and the machine interfaces every page exposes.
section: The Hub
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

<!-- Drop the diagram here as an image reference, not inline SVG — Pandoc drops
     raw HTML on the way to PDF, so an inline <svg> would show on the site and
     vanish from the deliverable:
       ![Hub architecture](./architecture.svg)
     Astro treats it as a collection asset; Quarto converts it for Typst. -->

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

### Introduction

The Hub's datasets are cloud-native and machine-readable, but reaching a usable
result still demands knowledge most researchers don't carry day-to-day: which
source holds which variable, how to clip a raster to an administrative boundary,
which aggregation preserves the right units, how to run DSSAT over a spatial
grid, what fields the CDH metadata schema requires. The goal of the agent skills
work was to close that gap — let a researcher state what they need in plain
language and have an AI agent execute the full workflow correctly, from raw
download to a shareable output.

#### UseCase personas

This workflow was developed with two different kinds of users in mind: one
with advanced programming and agent experience, the other needing to access
the information quickly, using only simple prompts.

For the first group, examples of adopting the tool through the terminal were
developed; for the second, GUI interfaces such as Antigravity or Codex were
used.

#### What are skills?
#### Why skills?

A bespoke chatbot would require its own server, authentication stack, and
ongoing maintenance, and would work with only one AI provider. A custom API
wrapper would still leave the user writing code to call it.

Agent Skills are a different answer: plain-text `SKILL.md` files that encode
workflow instructions any compatible assistant can load and follow. The format
is open — Claude Code, OpenAI Codex, Antigravity, and OpenCode all read the
same folder — so each workflow is published once and works everywhere, with no
server to operate and no vendor lock-in.


### Methodology

### Skills creation



Each skill was built and iterated using Anthropic's
[skill-creator](https://github.com/anthropics/skills) — an open meta-skill that
interviews you about the task, drafts a `SKILL.md`, proposes test prompts,
runs them in parallel (with skill enabled vs. without), and shows outputs
side-by-side with pass rates. The loop is: describe the task → review the draft
→ run evals → leave feedback → skill-creator rewrites and re-runs — until
pass rates are satisfactory. This process keeps skill writing grounded in
observed agent behavior rather than intuition about what instructions should
work.

### Repository structure

Skills live in the `.agents/skills/` folder of the skills repository.

### Underlying Python packages

Most foundational skills are conversational wrappers around two Python
packages — [`aggeodata`](https://github.com/CGIAR-Climate-Data-Hub/aggeodata)
for data acquisition and
[`ag-cube-cm`](https://github.com/CGIAR-Climate-Data-Hub/ag-cube-cm) for crop
model orchestration — described in [Python packages](#python-packages) below.
A skill's job is to collect parameters, confirm a plan, and hand off to the
package; the package does the actual download, processing, or simulation.

### Design pattern: foundational skills + orchestrators

The work was decomposed into single-responsibility *foundational skills*, each
owning one well-defined task. *Orchestrator skills* sit on top: they collect
parameters, confirm a plan with the researcher, then delegate each stage to the
relevant foundational skill rather than re-implementing it. Any foundational
skill can therefore be used alone or updated without touching the orchestrators.

![Skills orchestrator diagram](src/assets/orchestrator.png)

### Results

#### Scoping

These are the skills that were developed to be used across different use
cases; the idea is that when multiple projects share similar activities,
those processes can be standardized into common steps.

This is an initial set that will expand following CGIAR project requirements.

The foundational skills developed so far are:

**Data acquisition**

| Skill | What it does |
|---|---|
| `climate-data-download` | Routes each variable to its authoritative source (CHIRPS, CHIRTS-ERA5, NASA POWER, AgERA5), shows a plan, and fetches in sequence |
| `soil-data-download` | Downloads SoilGrids global soil property rasters (clay, sand, silt, bulk density, organic carbon, pH) and stacks them into a validated NetCDF soil datacube |

**Spatial processing and visualization**

| Skill | What it does |
|---|---|
| `geospatial-cube-processor` | Clips rasters to admin boundaries (GADM), stacks multi-source datasets onto a common grid, computes zonal statistics, exports Cloud Optimized GeoTIFFs |
| `notebook-plots` | Inserts interactive Plotly chart cells into an existing Jupyter notebook; exports a standalone Plotly HTML file alongside it |
| `climate-dashboard` | Builds a self-contained Chart.js HTML dashboard — KPI cards, filters, sortable table — that opens in any browser with no server |
| `sciplot-skill` | Generates publication-ready matplotlib figures meeting the typography and resolution standards of high-impact journals (Nature, Science, Cell) |

**Hub utilities**

| Skill | What it does |
|---|---|
| `cdh-metadata` | Inspects a geospatial dataset, asks for fields it cannot derive automatically, and writes a valid CDH YAML metadata record ready for submission to the catalog |


So far, only two use cases have been considered: GCF and AgWISE. These skills
are likely to be reused across other projects too, since climate information
is required well beyond either of them — that reuse is the whole point of
building foundational skills.

#### Use cases

##### GCF climate data access

Green Climate Fund (GCF) proposals need a defensible climate rationale —
grounded in subnational climate and agricultural data — to justify the case
for funding. Producing that evidence today is slow and manual: sourcing the
right variables per country, clipping them to the right boundary, and
assembling the tables a Concept Note or Funding Proposal expects. The
`gcf-pipeline` orchestrator automates that data-gathering step, so a proposal
writer states what they need and gets back ready-to-use tables, rasters, and
figures instead of raw downloads.

The `gcf-pipeline` orchestrator enforces six explicit gates, so no stage runs
before the researcher has approved the plan:

1. **Collect parameters** — country, variables, date range, output folder,
   admin level, aggregation method, temporal frequency
2. **Confirm plan** — the agent shows exactly what will be downloaded and how
   it will be processed; nothing moves until the researcher approves
3. **Download** — delegates to `climate-data-download`, which fetches the
   required NetCDF files
4. **Process** — delegates to `geospatial-cube-processor`, which clips,
   aggregates, and exports a CSV and COG per variable
5. **Visualize** — delegates to `notebook-plots` and `climate-dashboard` in
   parallel; both outputs are produced by default
6. **Summary** — lists every output path and its size

The confirmation gate at step 2 is the most important: it surfaces mis-routing
(wrong variable, wrong boundary level) before a long download begins rather
than after.


##### AgWise spatial crop modeling

AgWise is a CGIAR framework that turns field-trial, market, topography,
climate, and soil data into tailored agronomic recommendations — fertilizer
rates, planting dates, cultivar choice — for partners across Africa. Its
fertilization module depends on process-based crop model simulations, which
need high-resolution climate and soil data run pixel-by-pixel across a
region. The `spatial-crop-modeler` orchestrator closes that gap, driving the
`aggeodata` and `ag-cube-cm` packages end-to-end so the fertilization module
always has current, validated yield inputs.

The `spatial-crop-modeler` orchestrator runs DSSAT pixel-by-pixel over a
spatial domain, combining climate and soil datacubes into a yield map. Its
first design decision is a mode question: whether the datacubes already exist
on disk (`with_cubes`) or need to be downloaded and assembled first
(`full_pipeline`). Skipping unnecessary downloads when the user already has the
data is the main reason the mode exists — the simulation itself is identical in
both cases.

Before collecting any parameters the skill runs a silent environment check,
verifying that `ag-cube-cm`, `aggeodata`, and `mcp` are all importable. If any
are missing it stops and shows the exact install command. This prevents the
common failure of reaching step 5 only to discover the simulation tool was
never installed.

The eight gates in `full_pipeline` mode:

1. **Environment check** — silently verifies `ag-cube-cm`, `aggeodata`, and
   `mcp` are installed; stops with the install command if any are missing
2. **Collect parameters** — bounding box, date range, crop name, cultivar
   code, planting date, output directory; for `full_pipeline` also climate
   sources and a suffix label for file naming
3. **Confirm plan** — shows mode, area, period, climate and soil sources, crop,
   planting date, and output path in a single table; no files are written until
   the researcher approves
4. **Generate YAML config** — writes the `ag-cube-cm` config file; flags any
   `working_path` that contains spaces (DSSAT is a Fortran program that fails
   silently on space-containing paths)
5. **Validate config** — runs `ag-cube-cm validate` and resolves any errors
   before touching data
6. **Run simulation** — runs `ag-cube-cm run`; for `full_pipeline` this
   downloads climate via `climate-data-download`, builds the weather datacube,
   delegates soil download to `soil-data-download`, then runs DSSAT across
   every pixel; intermediate files are cached so re-runs skip completed steps
7. **Quality gate** — mandatory before any visualization; checks three
   thresholds: at least 20 % of pixels succeeded (`flag=0`), fewer than 50 %
   failed (`flag=1`), and mean harvest yield (`HWAM`) above 200 kg/ha; a clean
   exit code from DSSAT is not a quality signal — the gate exists because
   `ag-cube-cm` exits cleanly even when the entire domain is over water or the
   planting season is wrong; if any threshold fails the skill halts, surfaces
   the pixel summary, and diagnoses before proceeding
8. **Visualize** — only after the quality gate passes; delegates to
   `notebook-plots` and `climate-dashboard` for the yield map and summary
   figures

The quality gate at step 7 is the sharpest difference from the GCF pipeline.
Because DSSAT's exit code does not distinguish a successful run from a run that
produced no valid output, a mandatory programmatic check is the only reliable
way to stop a researcher from presenting an all-NaN yield map as results.


#### How to use these skills

Which interface fits depends on the persona described in the introduction:
technical users run skills directly from a terminal-based agent (Claude Code,
OpenAI Codex), while non-technical users go through a GUI-based agent
(Antigravity) that follows the same `SKILL.md` workflow with no command line
involved. See [Publishing and discovery](#publishing-and-discovery) below for
how each is installed.

### Publishing and discovery

Skills live in
[github.com/CGIAR-Climate-Data-Hub/skills](https://github.com/CGIAR-Climate-Data-Hub/skills),
separate from the site source. The Hub fetches them at build time via the
`skills()` Astro loader (`src/lib/skills.ts`), using the same mechanism as the
catalog fetch from `cdh-catalog`. A `skills.json` index at the repo root maps
each skill name to its `SKILL.md` path; agents resolve that index and verify
the content hash recorded in their local `skills-lock.json` before installing
or updating, so researchers always run the version they checked.

The repository also ships deployment guides for Antigravity and OpenAI Codex
alongside the Claude Code guide, so the full pipeline is accessible to
researchers who do not have a paid Claude subscription.



## Python packages

Two open-source Python packages do the heavy lifting behind the foundational
skills — each skill is a thin conversational wrapper around one of them, and
both can be used directly, without an AI agent, by anyone comfortable
scripting the workflow.

### aggeodata

[`aggeodata`](https://github.com/CGIAR-Climate-Data-Hub/aggeodata) handles
data acquisition: it downloads daily gridded climate data from CHIRPS,
CHIRTS, AgERA5, and NASA POWER, and static soil properties from SoilGrids,
then assembles them into analysis-ready NetCDF datacubes aligned to a common
grid and CRS. A YAML-driven pipeline (`run_download` → `run_datacube`) covers
the common case; each source also has a standalone downloader for one-off
use.

### ag-cube-cm

[`ag-cube-cm`](https://github.com/CGIAR-Climate-Data-Hub/ag-cube-cm) is the
crop-modeling layer: it takes the datacubes `aggeodata` builds and runs a
process-based crop model — DSSAT, CAF2021, SIMPLE, or the pure-Python
Banana-N model — pixel-by-pixel across the domain in parallel, producing a
gridded yield map (kg/ha) across planting windows, years, and space. It
performs no downloads of its own. Both packages ship an MCP server, so an AI
agent can drive the same two-step workflow the `spatial-crop-modeler` skill
uses.

## Versioning

<!-- Field-based versioning: version, previous_version, deprecated — and why
     folder layout is never used to infer a version. -->

## Repositories

<!-- What lives where across the GitHub org, so a reader can find the source
     for any layer above. -->
