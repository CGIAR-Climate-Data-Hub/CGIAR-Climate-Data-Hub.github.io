# Example records

Dev fixtures for the `catalog` collection — enough records to light up the
catalog, record pages, and `/catalog.json` without cloning `cdh-catalog`.

```sh
bun run dev:example            # dev server with these records
RECORDS_DIR=examples/records bun run build   # full build with them
```

They are used **only** when `RECORDS_DIR` points here — production builds
always fetch the real catalog. Files must validate against the `catalog`
schema in `src/content.config.ts` (same rules as real records; the loader
picks up any `*.yaml`/`*.yml` in this folder, this README is ignored).

Worth covering, to exercise every record-page path: one spatial dataset with
templated assets (snippets, STAC link), one tabular dataset, and two
releases of one record — both share an `id`, the superseded one is
`deprecated: true` and is served at `/catalog/<id>_<version>/`. Folders carry
no meaning; layout is organization only. A record whose
`processing[].derived_from` names another record's `id` also lights up the
provenance cross-links.

These are copies of the `examples/` records in the metadata standard repo;
refresh them from there when the standard changes.
