# Site (Astro app)

Static documentation/data hub built with **Astro 6** (output: `static`).

## Layout

Astro source lives in `src/`: `pages/`, `layouts/`, `components/`, `styles/`,
`assets/`, `content/` (collections: `tutorials`, `wikis`, `catalog`). Content
collections are defined in `src/content.config.ts`; site-wide constants live in
`src/site.config.ts`.

## Commands

- `bun install` — install deps
- `bun dev` — dev server at `localhost:4321`
- `bun build` — build to `dist/`
- `bun check` — lint + format check (Biome)
- `bun fix` — auto-fix lint/format (Biome `check --write`)
- `bun ci` — CI lint check (Biome, no writes)
- `bun astro check` — type-check Astro/TS

## Linting & formatting

- **Biome** is the single tool for both lint and format (`biome.json`). Run
  `bun fix` before committing.
- Space indentation; imports, attributes, and properties are auto-sorted.
- Respects `.gitignore`. Don't hand-format — let Biome do it.

## Conventions

- Package manager: **Bun** (`bun.lock`). Node `>=22.12`.
- Astro pages use `.astro`/`.mdx`; markdown is processed with
  `@astrojs/markdown-satteri` (directives enabled).
- Search via `astro-pagefind`; sitemap via `@astrojs/sitemap`.
- Site is served at the GitHub Pages **root**, so there's no `base` (defaults to
  `/`). The canonical domain is hardcoded as `site` in `astro.config.mjs` — to
  move to a custom domain, change that one value and add `public/CNAME`.
- Style with the design tokens in `src/styles/tokens.css`.
- Deployed to GitHub Pages via `.github/workflows/astroDeploy.yml` on push to
  `main` (or manual dispatch).
