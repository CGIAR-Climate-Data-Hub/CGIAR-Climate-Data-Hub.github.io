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
templated assets (snippets, STAC link), one tabular dataset, and a versioned
pair per standard §4.7 — a current record (stable id, `previous_version`
pointing back) plus its frozen snapshot (`<id>-v1`, `deprecated: true`).
Folders carry no meaning; layout is organization only. A record whose
`processing[].derived_from` url points at another record's page
(`/catalog/<id>/`) also lights up the provenance cross-links.
