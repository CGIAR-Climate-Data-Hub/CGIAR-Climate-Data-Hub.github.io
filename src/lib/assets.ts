// What an asset card renders, derived once per asset (components/AssetCard.astro)
import {
  type Asset,
  type CatalogRecord,
  formatBestFor,
  geoLabel,
  httpUrl,
  inventoryCsv,
  inventoryName,
  normalizeBboxes,
  resolveTemplate,
  templateInventory,
} from "@/lib/catalog";
import { inventoryPreview } from "@/lib/inventory";
import { assetExample, indexExample } from "@/lib/snippets";

// file_index formats, as the standard's file index table names them
const INDEX_LABELS: Record<string, string> = {
  "stac-geoparquet": "STAC-GeoParquet",
  gti: "GDAL Tile Index (GTI)",
  vrt: "GDAL VRT",
  kerchunk: "Kerchunk",
  icechunk: "Icechunk",
  "cdh-inventory": "CDH inventory",
};

// An asset's own coverage: place names, then bounding boxes (W, S, E, N)
const assetCoverage = (s?: Asset["spatial"]) =>
  s
  && [
    ...s.geography.map(geoLabel),
    ...(normalizeBboxes(s.bbox) ?? []).map((b) => `[${b.join(", ")}]`),
  ].join(" · ");

// Whether a browser shows a file of this type inline rather than saving it.
// The record's media_type stands in for the response Content-Type, which is
// what the browser actually decides on; CSV and TSV are the text types it saves
export const opensInline = (mediaType = "") =>
  /^(text\/(?!csv|tab-separated)|image\/|application\/(json|xml|pdf))/.test(
    mediaType,
  );

// In-page anchors for asset cards and structures; names may hold spaces
export const anchor = (kind: string, name: string) =>
  `${kind}-${name.replace(/[^\w-]+/g, "-")}`;

// - picker: what TemplatePicker needs for the asset's href_template;
//   undefined unless every token resolves. Sliced indexes carry their own
// - primary: the spotlighted access route (HTTPS when available); others
//   fills the disclosure — every location on templated and indexed assets,
//   where the panel shows a picker or index rather than a root URL
// - indexes: file_index entries in record order (the author lists the one to
//   open first); each row holds its snippet and, when sliced, its picker
// - download: only where one click yields one file — an http(s) URL to a
//   single object, never templated collections, Zarr stores, or prefixes.
//   Restricted records get no Download buttons on data (the click would
//   just be refused); URLs and copy stay for users who hold credentials,
//   and supporting files (guides, scripts) stay downloadable
export async function shapeAsset(
  d: CatalogRecord,
  asset: Asset,
  restricted: boolean,
) {
  const http = httpUrl(asset.locations);
  const primary =
    asset.locations.find((l) => l.url === http) ?? asset.locations[0];

  // What TemplatePicker renders for a template: the asset's own, or an
  // index's. `root` is the directory the picked file name is appended to
  const pickerOf = (
    source: Pick<Asset, "href_template" | "locations">,
    name: string,
    root = httpUrl(source.locations),
    resolved = resolveTemplate(d, asset, source.href_template),
  ) => {
    const inventory = resolved && templateInventory(d, asset, source, resolved);
    if (!resolved || !inventory || !root) return undefined;
    return {
      ...resolved,
      // The picker only needs the per-structure values when there are several
      combos:
        resolved.combos.length > 1
          ? JSON.stringify(resolved.combos)
          : undefined,
      template: source.href_template,
      root,
      url: root + resolved.file,
      count: inventory.count,
      csv: inventoryCsv(name),
    };
  };
  const picker = pickerOf(asset, inventoryName(asset));

  const indexes = (
    await Promise.all(
      asset.file_index.map(async (ix, i) => {
        const root = httpUrl(ix.locations) ?? ix.locations[0]?.url;
        if (!root) return undefined;
        // One index per slice: the row carries a picker over the rendered
        // files. Unresolvable templates drop the row, as assets do
        const picker = ix.href_template
          ? pickerOf(ix, inventoryName(asset, i), root)
          : undefined;
        if (ix.href_template && !picker) {
          console.warn(
            `${d.id}: ${asset.name} index template does not resolve`,
          );
          return undefined;
        }
        const url = picker ? picker.url : root;
        const label = INDEX_LABELS[ix.format] ?? ix.format;
        const source = asset.locations[0]?.url ?? "<source prefix>/";
        // The full URL, or the templated one for a sliced index
        const name = picker ? root + picker.template : url;
        const snippet = indexExample(ix.format, url, source);
        const preview =
          ix.format === "cdh-inventory" && !picker
            ? await inventoryPreview(url)
            : undefined;
        return {
          format: ix.format,
          label,
          url,
          name,
          snippet,
          preview,
          picker,
        };
      }),
    )
  ).filter((ix): ix is NonNullable<typeof ix> => ix !== undefined);
  const index = indexes[0];

  // A templated or indexed asset's locations are directories the picker or
  // index builds on; a single file's primary already shows in its panel
  const dirs = Boolean(asset.href_template || index);
  const others = (
    dirs ? asset.locations : asset.locations.filter((l) => l !== primary)
  ).map((loc) => ({
    label: `${loc.title ?? "URL"}${dirs ? " directory" : ""}`,
    url: loc.url,
  }));

  // The path alone: a query or fragment must not hide a directory or .zarr
  const path = http ? (URL.parse(http)?.pathname ?? http) : "";
  const lastSegment = path.split("/").pop() ?? "";
  return {
    // An indexed asset's root is a directory, not a file to open; a
    // restricted one needs credentials the templates don't carry
    example: index || restricted ? undefined : assetExample(d, asset),
    bestFor: formatBestFor(asset.media_type),
    extent: assetCoverage(asset.spatial),
    primary,
    index,
    indexes,
    // The one index row that starts open
    openIndex: indexes.find((ix) => ix.snippet || ix.picker),
    others,
    picker,
    download:
      (!restricted || !d.data.includes(asset))
      && !asset.href_template
      && http
      && !path.endsWith("/")
      && lastSegment.includes(".")
      && !lastSegment.endsWith(".zarr")
        ? http
        : undefined,
  };
}
