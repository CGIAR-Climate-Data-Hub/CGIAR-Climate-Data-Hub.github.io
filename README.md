# CGIAR Climate Data Hub

## Development

```sh
bun install
bun run dev     # dev server at localhost:4321
bun run build   # static build to dist/
bun run check   # lint + format (Biome)
```

## Catalog records

Dataset records are **not** in this repo — the `catalog` collection is
fetched at build time from
[`cdh-catalog`](https://github.com/CGIAR-Climate-Data-Hub/cdh-catalog)'s
`records/` directory (that repo triggers a site rebuild when records change).
To point a local session elsewhere, use shell environment variables
(`.env` files don't reach the loader):

```sh
# A local checkout — offline, previews uncommitted records
RECORDS_DIR=../cdh-catalog/records bun run dev

# A branch of cdh-catalog (e.g. an open data PR)
RECORDS_REF=my-branch bun run dev

# A different repo, e.g. a fork (composes with RECORDS_REF)
RECORDS_REPO=you/cdh-catalog bun run dev
```

Unset, builds fetch `cdh-catalog@main`. If the records fetch fails, the
previously loaded records are kept, so offline dev keeps working.

Don't commit record YAML to this repo — `src/content/catalog/` is
gitignored and anything in it is ignored by the build; records belong in
`cdh-catalog`.

## Licensing

- **Website content** (text, documentation, images) is licensed under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Source code** is licensed under [MIT](./LICENSE).
- **Datasets** are licensed individually — see the `license` field of each
  catalog record.
