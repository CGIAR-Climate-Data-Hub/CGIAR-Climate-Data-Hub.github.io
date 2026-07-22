# Site (Astro app)

Static documentation/data hub built with **Astro 7** (output: `static`).

## Layout

Astro source lives in `src/`: `pages/`, `layouts/`, `components/`, `styles/`,
`assets/`, `lib/` (shared record-shaping + JSON-LD helpers), `content/`
(collections: `tutorials`, `wikis`, `useCases`, `faq`, `pages`). The `catalog`
collection (CDH YAML metadata records) is fetched at build time from the
`cdh-catalog` repo's `records/` dir (`src/lib/records.ts`; shell-env overrides — `.env` files don't reach it:
`RECORDS_DIR` local checkout, `RECORDS_REF` branch, `RECORDS_REPO` fork), and
that repo
triggers a site rebuild via `repository_dispatch` when records change.
The `skills` collection (agent skills for `/ai/`) is fetched the same way
from the `skills` repo's `.agents/skills/` (`src/lib/skills.ts`; overrides:
`SKILLS_DIR`, `SKILLS_REF`, `SKILLS_REPO`).
Dev fixtures live in `examples/records/` and `examples/skills/` —
`bun run dev:example` builds from them (see each folder's README).
Content collections are defined in `src/content.config.ts`;
site-wide constants live in `src/site.config.ts`.

## Commands

- `bun install` — install deps
- `bun run dev` — dev server at `localhost:4321`
- `bun run build` — build to `dist/`
- `bun run check` — lint + format check (Biome)
- `bun run fix` — auto-fix lint/format (Biome `check --write`)
- `bun run ci` — CI lint check (Biome, no writes)
- `bun run astro check` — type-check Astro/TS

## Linting & formatting

- **Biome** is the single tool for both lint and format (`biome.json`). Run
  `bun fix` before committing.
- Space indentation; imports, attributes, and properties are auto-sorted.
- Respects `.gitignore`. Don't hand-format — let Biome do it.

## Conventions

- Package manager: **Bun** (`bun.lock`). Node `>=22.12`.
- Astro pages use `.astro`/`.mdx`; markdown is processed with Astro's default
  Sätteri pipeline (`@astrojs/markdown-satteri` is a direct dependency only
  because catalog pages use its `createRenderer` for record descriptions).
- Search via `astro-pagefind`; sitemap via `@astrojs/sitemap`.
- Site is served at the GitHub Pages **root**, so there's no `base` (defaults to
  `/`). The canonical domain is hardcoded as `site` in `astro.config.mjs` — to
  move to a custom domain, change that one value and add `public/CNAME`.
- Record-page example code lives in `src/snippets/` as
  `(quickstart|subset)-<format>.{py,R}` templates with a `__URL__`
  placeholder, where `<format>` is a concept id from
  `src/assets/format-vocab.json` (id ↔ media type ↔ label). To support a
  new data format: add a vocab entry + template files, nothing else.
- Deployed to GitHub Pages via `.github/workflows/astroDeploy.yml` on push to
  `main` (or manual dispatch).

## CSS

- Plain CSS: scoped `<style>` blocks per component plus shared
  `src/styles/tokens.css`. No Tailwind/Sass/CSS Modules — Astro's scoping and
  native CSS already cover what they'd add.
- Shared colors, radii, and shadows come from `var(--…)`, never raw hex values
  in components. Use the compact `--space-*` scale for ordinary margins,
  padding, and layout gaps when an exact token exists; one-off structural
  dimensions, typography, SVG coordinates, and breakpoints may stay literal.
  (`grep -rn '#[0-9a-f]\{3,6\}' src/components src/pages` should stay
  near-empty).
- Rule of three: the same styles duplicated in two components are fine; on the
  third repetition, promote to a shared component or class.
- Prune at the end of each feature: merge style blocks that have converged,
  delete selectors nothing uses. Component styles die with their component.
