// What an asset card renders, derived once per asset (components/AssetCard.astro)
import {
  type Asset,
  type CatalogRecord,
  formatBestFor,
  geoLabel,
  httpUrl,
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

// In-page anchors for asset cards and structures; names may hold spaces
export const anchor = (kind: string, name: string) =>
  `${kind}-${name.replace(/[^\w-]+/g, "-")}`;

// - tplFields: one select per template token, options from the dimension's
//   values or extent (or variable names); undefined unless every one resolves
// - tplFile/tplUrl: the picker's prerendered default (first value per field)
// - primary: the spotlighted access route (HTTPS when available); others
//   fills the disclosure — everything on templated assets, where the picker
//   stands in for the access panel and no root URL shows above
// - indexes: file_index entries in record order (the author lists the one to
//   open first); the first stands in for the access panel, the rest and the
//   files directory go to the disclosure, and their snippets sit inline
// - download: only where one click yields one file — an http(s) URL to a
//   single object, never templated collections, Zarr stores, or prefixes.
//   Restricted records get no Download buttons at all (the click would just
//   be refused); URLs and copy stay for users who hold credentials
export async function shapeAsset(
  d: CatalogRecord,
  asset: Asset,
  restricted: boolean,
) {
  const http = httpUrl(asset.locations);
  const primary =
    asset.locations.find((l) => l.url === http) ?? asset.locations[0];

  const resolved = resolveTemplate(d, asset);
  const tplFields = resolved?.fields;
  const tplFile = resolved?.file;

  const indexes = (
    await Promise.all(
      asset.file_index.map(async (ix) => {
        const url = httpUrl(ix.locations) ?? ix.locations[0]?.url;
        if (!url) return undefined;
        const label = INDEX_LABELS[ix.format] ?? ix.format;
        const source = asset.locations[0]?.url ?? "<source prefix>/";
        const path = URL.parse(url)?.pathname ?? url;
        // An Icechunk repo, or any index given as a prefix, is not one file
        const isDir = ix.format === "icechunk" || path.endsWith("/");
        // "cogs.vrt", or "suitability/" for a prefix
        const name = `${path.replace(/\/$/, "").split("/").pop()}${path.endsWith("/") ? "/" : ""}`;
        const snippet = indexExample(ix.format, url, source);
        const preview =
          ix.format === "cdh-inventory"
            ? await inventoryPreview(url)
            : undefined;
        return { label, url, name, isDir, snippet, preview };
      }),
    )
  ).filter((ix): ix is NonNullable<typeof ix> => ix !== undefined);
  const index = indexes[0];

  // Indexed assets list their indexes in their own panel; a templated asset
  // lists its directories, which the picker builds URLs from
  const others = index
    ? []
    : (asset.href_template
        ? asset.locations
        : asset.locations.filter((l) => l !== primary)
      ).map((loc) => ({
        label: `${loc.title ?? "URL"}${asset.href_template ? " directory" : ""}`,
        url: loc.url,
      }));

  // The path alone: a query or fragment must not hide a directory or .zarr
  const path = http ? (URL.parse(http)?.pathname ?? http) : "";
  const lastSegment = path.split("/").pop() ?? "";
  return {
    // An indexed asset's root is a directory, not a file to open
    example: index ? undefined : assetExample(d, asset),
    bestFor: formatBestFor(asset.media_type),
    extent: assetCoverage(asset.spatial),
    primary,
    index,
    indexes,
    // The one index row that starts open
    openIndex: indexes.find((ix) => ix.snippet),
    others,
    tplFields,
    tplFile,
    tplUrl: tplFile && http ? http + tplFile : undefined,
    // How many files the template names; [asset]-files.csv lists them
    fileCount: templateInventory(d, asset, resolved)?.count,
    download:
      !restricted
      && !asset.href_template
      && http
      && !path.endsWith("/")
      && lastSegment.includes(".")
      && !lastSegment.endsWith(".zarr")
        ? http
        : undefined,
  };
}
