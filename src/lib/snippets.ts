// Example code for record pages, assembled from the template files in
// src/snippets named (quickstart|subset)-<format>.<ext>, where <format> is a
// format-vocab concept id (or geoparquet, see assetFormat), or
// index-<file_index format>.<ext>, whose __SOURCE__ gets the asset's own
// location (where Icechunk's virtual chunks live). <ext> is a LANGUAGES
// extension. The __URL__ placeholder gets the asset's root URL, or one real
// file URL for templated assets. A new format = a vocab entry + template
// files; a new language = a LANGUAGES entry + template files.
import type { CatalogRecord } from "@/lib/catalog";
import {
  formatConcept as concept,
  heldStructures,
  httpUrl,
  resolveTemplate,
} from "@/lib/catalog";

const FILES = import.meta.glob("/src/snippets/*", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const TEMPLATES = Object.entries(FILES).flatMap(([path, code]) => {
  const m = path.match(/(quickstart|subset|index)-([\w-]+)\.(\w+)$/);
  return m ? [{ kind: m[1], format: m[2], lang: m[3], code }] : [];
});

// An asset's snippet format: its vocab concept, except Parquet with a
// geometry column in its structures, which is GeoParquet
function assetFormat(d: CatalogRecord, asset: CatalogRecord["data"][number]) {
  const c = concept(asset.media_type);
  if (c?.id !== "parquet") return c;
  return heldStructures(d, asset).some((s) => s.geometry_column)
    ? { id: "geoparquet", label: "GeoParquet" }
    : c;
}

// An asset's example URL: its root, or one real file when templated
function exampleUrl(d: CatalogRecord, asset: CatalogRecord["data"][number]) {
  const root = httpUrl(asset.locations);
  if (!root || !asset.href_template) return root;
  const file = resolveTemplate(d, asset)?.file;
  return file ? `${root}${file}` : undefined;
}

// One entry per format the record ships, in record asset order — the first
// asset of each format with a usable URL represents it
function formatAssets(d: CatalogRecord) {
  const done = new Set<string>();
  const out: { id: string; label: string; url: string }[] = [];
  for (const asset of d.data) {
    if (asset.file_index.length > 0) continue;
    const c = assetFormat(d, asset);
    if (!c || done.has(c.id)) continue;
    const url = exampleUrl(d, asset);
    if (!url) continue;
    done.add(c.id);
    out.push({ id: c.id, label: c.label, url });
  }
  return out;
}

// Every language the examples come in, in tab order. To add one: an entry
// here plus template files with its extension. `id` is also the Shiki
// language; `script` is the media type of an author-provided example script.
export const LANGUAGES = [
  { id: "python", ext: "py", label: "Python", script: "text/x-python" },
  { id: "r", ext: "R", label: "R", script: "text/x-r" },
  { id: "sh", ext: "sh", label: "CLI" },
];

// The language an author's script is in, by its media type
export const scriptLanguage = (mediaType?: string) =>
  LANGUAGES.find(
    (l) => l.script && mediaType?.toLowerCase().startsWith(l.script),
  );

// Code per language id, for SnippetTabs
export type Snippets = Record<string, string>;

const render = (
  kind: string,
  format: string,
  ext: string,
  url: string,
  source = "",
) =>
  TEMPLATES.find(
    (t) => t.kind === kind && t.format === format && t.lang === ext,
  )
    ?.code.replaceAll("__URL__", url)
    .replaceAll("__SOURCE__", source)
    .trim();

// One template in every language that has it; undefined when none does
function renderAll(kind: string, format: string, url: string, source = "") {
  const out: Snippets = {};
  for (const l of LANGUAGES) {
    const code = render(kind, format, l.ext, url, source);
    if (code) out[l.id] = code;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// How to open one file index, for the formats that have templates
export const indexExample = (format: string, url: string, source: string) =>
  renderAll("index", format, url, source);

// Worked example for one asset, filled with that asset's own URL, in
// whichever languages have a subset template for its format
export function assetExample(
  d: CatalogRecord,
  asset: CatalogRecord["data"][number],
) {
  const format = assetFormat(d, asset)?.id;
  const url = format && exampleUrl(d, asset);
  return format && url ? renderAll("subset", format, url) : undefined;
}

// An author's script, fetched at build time; a failed or oversized fetch
// yields nothing, and the callers fall back to links or generated code
const MAX_BYTES = 20_000;

export async function fetchScript(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const code = res.ok ? (await res.text()).trim() : "";
    return code && code.length <= MAX_BYTES ? code : undefined;
  } catch {
    return undefined;
  }
}

// A record's own example script: an additional asset with role `example`
// and the language's script media type. Notebooks stay links.
async function authorExample(d: CatalogRecord, mediaType: string) {
  const url = d.additional_assets.find(
    (a) =>
      a.roles.includes("example")
      && a.media_type?.toLowerCase().startsWith(mediaType),
  )?.locations[0]?.url;
  const code = url && (await fetchScript(url));
  return code ? { code, url } : undefined;
}

// Quick start per language: the authors' own script where the record ships
// one, else one short generated block per format, stacked. A restricted
// record gets no generated code: its URLs don't open as the templates assume
export async function quickstart(d: CatalogRecord, restricted = false) {
  const code: Snippets = {};
  const authored: { id: string; label: string; url: string }[] = [];
  for (const l of LANGUAGES) {
    const own = l.script ? await authorExample(d, l.script) : undefined;
    if (own) authored.push({ id: l.id, label: l.label, url: own.url });
    const block =
      own?.code
      ?? (restricted
        ? undefined
        : formatAssets(d)
            .map((f) => render("quickstart", f.id, l.ext, f.url))
            .filter(Boolean)
            .join("\n\n"));
    if (block) code[l.id] = block;
  }
  return { code, authored };
}
