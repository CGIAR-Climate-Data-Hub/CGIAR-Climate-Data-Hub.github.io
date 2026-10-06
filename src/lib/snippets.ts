// Example code for record pages, assembled from the template files in
// src/snippets named (quickstart|subset)-<format>.{py,R}, where <format> is
// a format-vocab concept id, or index-<file_index format>.{py,R,sh}, whose
// __SOURCE__ gets the asset's own location (where Icechunk's virtual chunks live). The __URL__ placeholder gets the asset's root
// URL, or one real file URL for templated assets. Supporting a new format =
// a vocab entry + template files, nothing else.
import type { CatalogRecord } from "@/lib/catalog";
import { formatConcept as concept, exampleTemplateFile } from "@/lib/catalog";

const FILES = import.meta.glob("/src/snippets/*", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const TEMPLATES = Object.entries(FILES).flatMap(([path, code]) => {
  const m = path.match(/(quickstart|subset|index)-([\w-]+)\.(\w+)$/);
  return m ? [{ kind: m[1], format: m[2], lang: m[3], code }] : [];
});

// An asset's example URL: its root, or one real file when templated
function exampleUrl(d: CatalogRecord, asset: CatalogRecord["data"][number]) {
  const root = asset.locations.find((l) => l.url.startsWith("http"))?.url;
  if (!root || !asset.href_template) return root;
  const file = exampleTemplateFile(d, asset.href_template);
  return file ? `${root}${file}` : undefined;
}

// One entry per format the record ships, in record asset order — the first
// asset of each format with a usable URL represents it
function formatAssets(d: CatalogRecord) {
  const done = new Set<string>();
  const out: { id: string; label: string; url: string }[] = [];
  for (const asset of d.data) {
    const c = concept(asset.media_type);
    if (!c || done.has(c.id)) continue;
    const url = exampleUrl(d, asset);
    if (!url) continue;
    done.add(c.id);
    out.push({ id: c.id, label: c.label, url });
  }
  return out;
}

const render = (
  kind: string,
  format: string,
  lang: string,
  url: string,
  source = "",
) =>
  TEMPLATES.find(
    (t) => t.kind === kind && t.format === format && t.lang === lang,
  )
    ?.code.replaceAll("__URL__", url)
    .replaceAll("__SOURCE__", source)
    .trim();

// Quick start: one short block per format, stacked
export function quickstarts(d: CatalogRecord, lang: string) {
  return formatAssets(d)
    .map((f) => render("quickstart", f.id, lang, f.url))
    .filter((s): s is string => !!s);
}

// How to open one file index, for the formats that have templates
export function indexExample(format: string, url: string, source: string) {
  const python = render("index", format, "py", url, source);
  const r = render("index", format, "R", url, source);
  const sh = render("index", format, "sh", url, source);
  return python || r || sh ? { python, r, sh } : undefined;
}

// Worked example for one asset, filled with that asset's own URL, in
// whichever languages have a subset template for its format
export function assetExample(
  d: CatalogRecord,
  asset: CatalogRecord["data"][number],
) {
  const format = concept(asset.media_type)?.id;
  const url = format && exampleUrl(d, asset);
  if (!format || !url) return undefined;
  const python = render("subset", format, "py", url);
  const r = render("subset", format, "R", url);
  return python || r ? { python, r } : undefined;
}
