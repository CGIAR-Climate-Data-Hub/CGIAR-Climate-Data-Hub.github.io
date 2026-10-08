// Shared shaping of CDH catalog records for cards, facets, and JSON-LD.
import type { CollectionEntry } from "astro:content";
import formatVocab from "@/assets/format-vocab.json";
import { authorName, type Citable, citationText } from "@/lib/citation";
import {
  axisValues,
  fileCoordinates,
  fillTemplate,
  tokenNames,
} from "@/lib/template";
import {
  commodity,
  commodityWithParents,
  geography,
  geographyBboxes,
  geographyWithParents,
  isCommodityGroup,
  VOCAB_URL,
} from "@/lib/vocab";

const formatsById = new Map(
  formatVocab.concepts.map((format) => [format.id, format]),
);

// STAC catalogs are derived from these records by the publishing pipeline,
// so records never store STAC URLs — the site assumes this layout instead.
// If the pipeline publishes elsewhere, this is the one place to change.
const STAC_ROOT = "https://digital-atlas.s3.amazonaws.com/cdh/stac";

export function stacCollectionUrl(id: string) {
  return `${STAC_ROOT}/${id}/collection.json`;
}

// Days between values on a date-precision extent (P1D, P1W, P10D…)
function dayStep(dim?: {
  extent?: string[] | number[];
  step?: string | number;
}) {
  if (
    !dim?.extent
    || typeof dim.extent[0] !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(dim.extent[0])
  )
    return;
  if (typeof dim.step !== "string") return;
  const m = dim.step.match(/^P(?:(\d+)W)?(?:(\d+)D)?$/);
  const days = m ? Number(m[1] ?? 0) * 7 + Number(m[2] ?? 0) : 0;
  return days > 0 ? days : undefined;
}

export type Asset = CatalogRecord["data"][number];

// The structures an asset holds; its template tokens resolve against them.
// With one structure an asset may omit the list: it holds that one
export const heldStructures = (d: CatalogRecord, asset: Asset) =>
  asset.structures.length > 0
    ? d.structures.filter((s) => asset.structures.includes(s.name))
    : d.structures.slice(0, 1);

// An asset template's tokens with every value each takes (its dimension's,
// or the held variable names for {variable}), plus one real file from the
// first value per token. A daily axis also carries a date range, so the
// picker can show a native date field instead of a list spanning decades.
export function resolveTemplate(d: CatalogRecord, asset: Asset) {
  const template = asset.href_template;
  if (!template) return undefined;
  const held = heldStructures(d, asset);
  const fields = tokenNames(template).map((name) => {
    // The same dimension in every held structure, so the first will do
    const dim = held.flatMap((s) => s.dimensions).find((x) => x.name === name);
    const values = dim
      ? axisValues(dim)
      : name === "variable"
        ? held.flatMap((s) => s.variables.map((v) => v.name))
        : [];
    const days = dayStep(dim);
    const date = dim?.extent
      && typeof dim.extent[1] === "string"
      && days && { min: values[0], max: dim.extent[1], step: days };
    // Coded axes show their labels in the picker; the code still fills the URL
    const labels = dim?.categories.length
      ? Object.fromEntries(dim.categories.map((c) => [c.value, c.label]))
      : undefined;
    return { name, values, labels, date: date || undefined };
  });
  if (fields.some((f) => f.values.length === 0)) return undefined;
  const first = Object.fromEntries(fields.map((f) => [f.name, f.values[0]]));
  return { fields, file: fillTemplate(template, first) };
}

// One row per distinct URL. Only serialize CSV when requested, not for counts.
export function templateInventory(
  d: CatalogRecord,
  asset: Asset,
  resolved = resolveTemplate(d, asset),
) {
  const { href_template: template, locations } = asset;
  if (!template || !resolved) return undefined;
  const fields = resolved.fields.map((f) => ({
    name: f.name,
    ...fileCoordinates(template, f.name, f.values),
  }));
  const base =
    locations.find((l) => l.url.startsWith("http"))?.url ?? locations[0]?.url;
  let rows: string[][] = [[]];
  for (const f of fields)
    rows = rows.flatMap((row) => f.values.map((v) => [...row, v]));
  const files = new Map<string, string[]>();
  for (const row of rows) {
    const pick = Object.fromEntries(fields.map((f, i) => [f.name, row[i]]));
    const href = `${base ?? ""}${fillTemplate(template, pick)}`;
    files.set(href, [href, ...row.filter((_, i) => fields[i].column)]);
  }
  return {
    count: files.size,
    get csv() {
      const header = [
        "href",
        ...fields.filter((f) => f.column).map((f) => f.name),
      ];
      const cell = (v: string) =>
        /[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
      return `${[header, ...files.values()].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
    },
  };
}

export const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"];

// Bytes as "31.1 MB", in the standard's powers of 1000
export function formatBytes(n: number) {
  let i = 0;
  for (; n >= 1000 && i < SIZE_UNITS.length - 1; i++) n /= 1000;
  return `${+n.toFixed(1)} ${SIZE_UNITS[i]}`;
}

export function humanize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replaceAll("-", " ");
}

// Prefix match, so parameterised types ("…vnd.zarr; version=3") resolve
export const formatConcept = (mediaType?: string) =>
  formatVocab.concepts.find((f) => mediaType?.startsWith(f.media_type));

// Human label for an asset's format ("Cloud-Optimized GeoTIFF"), falling
// back to the bare media type for formats outside the vocab
export const formatLabel = (mediaType?: string) =>
  formatConcept(mediaType)?.label ?? mediaType?.split(";")[0];

// One-line guidance per format ("best for …"), from the same vocab
export const formatBestFor = (mediaType?: string) =>
  formatConcept(mediaType)?.best_for;

// Stable facet token: vocab id, else the bare media subtype ("csv")
export const formatId = (mediaType?: string) =>
  formatConcept(mediaType)?.id ?? mediaType?.split(";")[0]?.split("/").pop();

export const formatIdLabel = (id: string) =>
  formatsById.get(id)?.label ?? id.toUpperCase();

// Canonical UN M49 label ("Sub-Saharan Africa"), falling back for unknown ids
export function geoLabel(id: string) {
  return geography(id)?.label ?? humanize(id);
}

export function commodityLabel(id: string) {
  return commodity(id)?.label ?? humanize(id);
}

// A record's releases newest-first: they share one id, the current one is
// not deprecated, and each names its predecessor's version. Chain integrity
// is validated at catalog submission; a bad edge just ends the walk.
export function versionChain(
  id: string,
  entries: CollectionEntry<"catalog">[],
) {
  const releases = entries.filter((e) => e.data.id === id);
  const chain: CollectionEntry<"catalog">[] = [];
  let cursor = releases.find((e) => !e.data.deprecated);
  while (cursor && !chain.includes(cursor)) {
    chain.push(cursor);
    const prev = cursor.data.previous_version;
    cursor = releases.find((e) => e.data.version === prev);
  }
  return chain;
}

// Current releases only: deprecated snapshots stay reachable through their
// successor's version chain, never through indexes or feeds.
export function currentReleases(entries: CollectionEntry<"catalog">[]) {
  return entries.filter((e) => !e.data.deprecated);
}

// Releases share one id; <id>_<version> names one release, as the spec emits.
// Citations use it so they keep pointing at the release they cite.
export const versionedSlug = (d: CatalogRecord) => `${d.id}_${d.version}`;

// The current release lives at <id>; superseded ones at <id>_<version>
export const recordSlug = (d: CatalogRecord) =>
  d.deprecated ? versionedSlug(d) : d.id;

// The licensor's organization (a required role in the standard) is
// credited as the record's "source" — cards, page header, and rail alike
export const licensor = (d: CatalogRecord) =>
  d.contact.find((c) => c.roles.includes("licensor"))?.organization;

// M49 chain depth of the most specific tag (kenya → 5, africa → 2) to a
// coverage scale; sub-regions at depths 3-4 both read as regional
function scaleOf(tags: string[]) {
  const depth = Math.max(0, ...tags.map((g) => geographyWithParents(g).length));
  if (depth === 0) return undefined;
  if (depth === 1) return "global";
  if (depth === 2) return "continental";
  return depth <= 4 ? "regional" : "national";
}

export const HORIZONTAL = ["xy", "x", "y"];

// A grid step in words. Degrees convert exactly to arc-minutes or arc-seconds;
// the km figure is approximate and holds only at the equator (111.32 km/°)
export function spacingLabel(step: number, unit: string) {
  // degree (UDUNITS-2) or deg (UCUM); any other unit prints as written
  if (!/^deg/.test(unit)) return `${+step.toPrecision(6)} ${unit}`;
  const minutes = step * 60;
  const [n, word] =
    minutes >= 1 ? [minutes, "arc-minute"] : [minutes * 60, "arc-second"];
  const value = +n.toFixed(2);
  const km = step * 111.32;
  const ground =
    km >= 1 ? `${+km.toPrecision(2)} km` : `${+(km * 1000).toPrecision(2)} m`;
  return `${value} ${word}${value === 1 ? "" : "s"} (~${ground} at the equator)`;
}

// A record's distinct grid spacings: each regular horizontal axis in its
// structures. Coordinate columns (no step) are not a grid
export function gridSpacings(d: CatalogRecord) {
  const labels = d.structures.flatMap((s) =>
    s.dimensions.flatMap((x) =>
      HORIZONTAL.includes(x.type ?? "") && typeof x.step === "number" && x.unit
        ? [
            `${x.type === "xy" ? "" : `${x.type}: `}${spacingLabel(x.step, x.unit)}`,
          ]
        : [],
    ),
  );
  return [...new Set(labels)];
}

export function summarize(entry: CollectionEntry<"catalog">) {
  const d = entry.data;
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    type: d.spatial ? ("spatial" as const) : ("tabular" as const),
    license: d.license,
    source: licensor(d),
    // Distribution formats of the data assets, as facet tokens
    formats: [...new Set(d.data.flatMap((a) => formatId(a.media_type) ?? []))],
    access: d.access && d.access !== "public" ? "restricted" : "open",
    keywords: d.keywords.map((k) => (typeof k === "string" ? k : k.term)),
    coverage: d.spatial?.geography.map(geoLabel).join(", ") || undefined,
    // Short form for card meta rows — full label lives on the detail page
    resolution: gridSpacings(d)[0]?.split(" (")[0],
    temporal: temporalText(d.temporal)?.main,
    domains: d.cdh?.domain ?? [],
    // Tags plus their broader concepts, so filtering by a group rolls up;
    // the group tier of the closure feeds the facet
    commodities: [...new Set(d.commodities.flatMap(commodityWithParents))],
    commodityGroups: [
      ...new Set(
        d.commodities.flatMap(commodityWithParents).filter(isCommodityGroup),
      ),
    ],
    // Tags plus their M49 ancestors, so filtering by a region rolls up —
    // except the "world" root, which stays only when explicitly tagged:
    // the catalog filter reads world as "global, matches every region",
    // and every chain of ancestors ends at world
    geographies: [
      ...new Set((d.spatial?.geography ?? []).flatMap(geographyWithParents)),
    ].filter(
      (g) => g !== "world" || (d.spatial?.geography ?? []).includes("world"),
    ),
    // Coverage scale from the most specific tag's M49 chain depth:
    // world → global, a continent → continental, sub-regions → regional,
    // countries → national. Untagged records carry no scale.
    scale: scaleOf(d.spatial?.geography ?? []),
    // Explicit extent, else derived from geography tags for spatial search
    bboxes:
      normalizeBboxes(d.spatial?.bbox)
      ?? geographyBboxes(d.spatial?.geography ?? []),
    series: d.series?.name,
    updated: d.updated,
  };
}

export type DatasetSummary = ReturnType<typeof summarize>;

export type CatalogRecord = CollectionEntry<"catalog">["data"];

// Canonical deeds for the common licenses — friendlier than the spdx.org
// legal text, and the identifiers schema.org consumers recognize
const LICENSE_URLS: Record<string, string> = {
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
};

// One rule for page links and JSON-LD alike: the canonical deed when known,
// else the spdx.org page for simple SPDX ids. Submission also accepts
// compound expressions ("Apache-2.0 OR MIT", "… WITH …") and custom
// LicenseRef-* — neither has a page, so those render as plain text.
export function licenseUrl(license: string) {
  if (LICENSE_URLS[license]) return LICENSE_URLS[license];
  return /^(?!LicenseRef-)[A-Za-z0-9.+-]+$/.test(license)
    ? `https://spdx.org/licenses/${license}.html`
    : undefined;
}

// Records store one bbox or a list of them; normalize to a list.
export function normalizeBboxes(bbox?: number[] | number[][]) {
  if (!bbox || bbox.length === 0) return undefined;
  return (Array.isArray(bbox[0]) ? bbox : [bbox]) as number[][];
}

// Flatten record metadata into the shared citation shape.
export function citable(d: CatalogRecord): Citable | undefined {
  if (!d.citation) return undefined;
  return {
    ...d.citation,
    title: d.citation.title ?? d.title,
    doi: d.doi,
    key: d.id,
    version: d.version,
  };
}

const STEP_LABELS: Record<string, string> = {
  P1Y: "annual",
  P1M: "monthly",
  P10D: "10-daily",
  P1D: "daily",
  PT1H: "hourly",
};

const UPDATE_LABELS: Record<string, string> = {
  semiannual: "twice a year",
  annual: "yearly",
  irregular: "irregularly",
};

// "monthly" → "updated monthly"
export const updateLabel = (f: string) => `updated ${UPDATE_LABELS[f] ?? f}`;

// "P3M" → "every 3 months" (steps are pipeline-validated ISO 8601 durations)
export function stepLabel(step: string) {
  if (STEP_LABELS[step]) return STEP_LABELS[step];
  const m =
    step.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(\d+)H)?$/) ?? [];
  const parts = ["year", "month", "day", "hour"].flatMap((unit, i) =>
    m[i + 1] ? `${m[i + 1]} ${unit}${+m[i + 1] > 1 ? "s" : ""}` : [],
  );
  return `every ${parts.join(" ")}`;
}

// Shared dataset Markdown for llms-full.txt and record twins.
export function datasetMd(
  d: CatalogRecord,
  site: URL | undefined,
  sectionDepth = 4,
) {
  const abs = (path: string) => new URL(path, site).href;
  const citation = citable(d);
  const values = (v: string[]) =>
    v.length > 8
      ? `${v[0]} … ${v[v.length - 1]} (${v.length} values)`
      : v.join(", ");
  const dash = (...parts: (string | undefined)[]) =>
    parts.filter(Boolean).join(" — ");
  const temporal =
    d.temporal
    && ("date" in d.temporal
      ? d.temporal.date
      : `${d.temporal.start_date} to ${d.temporal.end_date ?? "ongoing"}${
          d.temporal.update_frequency
            ? `, ${updateLabel(d.temporal.update_frequency)}`
            : ""
        }`);

  const facts = [
    `URL: ${abs(`/catalog/${recordSlug(d)}/`)}`,
    `Metadata (JSON): ${abs(`/catalog/${recordSlug(d)}.json`)}`,
    d.data.length && `STAC collection: ${stacCollectionUrl(d.id)}`,
    `Resource type: ${d.resource_type}`,
    `License: ${d.license}`,
    d.attribution && `Attribution: ${d.attribution}`,
    d.parent && `Parent record: ${abs(`/catalog/${d.parent}/`)}`,
    d.access && dash(`Access: ${d.access}`, d.access_note),
    d.doi && `DOI: ${d.doi}`,
    temporal && `Temporal coverage: ${temporal}`,
    d.spatial?.geography.length
      && `Geography: ${d.spatial.geography.join(", ")}`,
    gridSpacings(d).length > 0
      && `Grid spacing: ${gridSpacings(d).join(" · ")}`,
    d.commodities.length && `Commodities: ${d.commodities.join(", ")}`,
    d.keywords.length
      && `Keywords: ${d.keywords
        .map((k) => (typeof k === "string" ? k : k.term))
        .join(", ")}`,
    d.data.length
      && `Data: ${d.data
        .map((a) => a.locations[0]?.url)
        .filter(Boolean)
        .join(" · ")}`,
    ...d.data.flatMap((a) => [
      a.checksum && `Checksum (${a.name}): ${a.checksum}`,
      ...a.file_index.map(
        (ix) => `File index (${a.name}, ${ix.format}): ${ix.locations[0]?.url}`,
      ),
      a.href_template
        && resolveTemplate(d, a)
        && `File list (${a.name}, CSV): ${abs(`/catalog/${recordSlug(d)}/${a.name}-files.csv`)}`,
    ]),
    ...d.additional_assets.map((a) =>
      dash(
        `Additional asset (${a.name}${a.roles.length ? `; roles: ${a.roles.join(", ")}` : ""}): ${a.locations[0]?.url}`,
        a.description,
      ),
    ),
    ...d.additional_links.map((l) =>
      dash(`Link: ${l.title ?? l.url}`, l.title && l.url, l.description),
    ),
  ].filter(Boolean);

  // Keep multiline record fields inside a single Markdown bullet.
  const bullets = (items: unknown[]) =>
    items
      .filter(Boolean)
      .map((i) => `- ${String(i).replace(/\s+/g, " ").trim()}`)
      .join("\n");
  const section = (title: string, items: unknown[]) => {
    const content = bullets(items);
    return content
      ? `${"#".repeat(sectionDepth)} ${title}\n\n${content}`
      : undefined;
  };

  // Names repeat across structures, so tag them with theirs when there are several
  const at = (s: { name: string }, name: string) =>
    d.structures.length > 1 ? `${s.name}/${name}` : name;
  const codes = (cats: { value: string; label: string }[]) =>
    cats.map((c) => `${c.value} = ${c.label}`);

  const c = d.climate;
  const blocks = [
    bullets(facts),
    d.description.trim(),
    section(
      "Variables",
      d.structures.flatMap((s) =>
        s.variables.map((v) =>
          dash(
            `${at(s, v.name)}${v.unit ? ` (${v.unit})` : ""}`,
            v.description,
            v.note,
          ),
        ),
      ),
    ),
    section(
      "Dimensions",
      d.structures.flatMap((s) =>
        s.dimensions.map((dim) =>
          dash(
            [
              at(s, dim.name),
              dim.extent
                ? dim.extent.join(" to ")
                : values(
                    dim.categories.length > 0
                      ? codes(dim.categories)
                      : dim.values,
                  ),
            ]
              .filter(Boolean)
              .join(": "),
            dim.data_type && `type ${dim.data_type}`,
            dim.step ? `step ${dim.step}` : undefined,
            dim.unit && `unit ${dim.unit}`,
            dim.reference_system && `coded against ${dim.reference_system}`,
            dim.description,
          ),
        ),
      ),
    ),
    section(
      "Categories",
      d.structures.flatMap((s) =>
        s.variables
          .filter((v) => v.categories.length > 0)
          .map((v) => `${at(s, v.name)}: ${codes(v.categories).join("; ")}`),
      ),
    ),
    section(
      "Geometry",
      d.structures.flatMap((s) =>
        s.geometry_column
          ? [`Geometry column: ${at(s, s.geometry_column)}`]
          : [],
      ),
    ),
    section(
      "Foreign keys",
      d.structures.flatMap((s) =>
        s.foreign_keys.map(
          (fk) =>
            `${fk.fields.map((f) => at(s, f)).join(", ")} → ${fk.reference.resource}${fk.reference.asset ? ` (${fk.reference.asset})` : ""}: ${fk.reference.fields.join(", ")}`,
        ),
      ),
    ),
    d.cdh
      && section("Intended use", [
        d.cdh.domain.length && `Domains: ${d.cdh.domain.join(", ")}`,
        ...d.cdh.usage.intended_uses.map((u) => `Intended: ${u}`),
        ...d.cdh.usage.not_recommended_for.map((n) =>
          dash(
            `Not recommended: ${n.use}`,
            n.reason,
            n.use_instead && `use instead: ${n.use_instead}`,
          ),
        ),
      ]),
    c
      && section("Climate modeling", [
        c.mip_era && `MIP era: ${c.mip_era}`,
        c.models.length && `Models: ${c.models.join(", ")}`,
        c.scenarios.length && `Scenarios: ${c.scenarios.join(", ")}`,
        c.baseline
          && `Baseline: ${c.baseline.start_date}${c.baseline.end_date ? ` to ${c.baseline.end_date}` : ""}`,
      ]),
    citation
      && `Cite: ${citationText(citation, abs(`/catalog/${versionedSlug(d)}/`))}`,
  ].filter(Boolean);

  return blocks.join("\n\n");
}

// Record dates are ISO 8601 at any precision ("2020", "1981-01", full
// timestamps), so the year is always the first four characters
export const year = (date: string) => date.slice(0, 4);

// Snapshot (date) or span; `step` is the time dimension's, labels the cadence
export function temporalText(t: CatalogRecord["temporal"], step?: string) {
  if (!t) return undefined;
  if ("date" in t) return { main: year(t.date) };
  const sub = [
    step && stepLabel(step),
    t.update_frequency && updateLabel(t.update_frequency),
  ].filter(Boolean);
  return {
    main: `${year(t.start_date)} – ${t.end_date ? year(t.end_date) : "present"}`,
    sub: sub.join(" · ") || undefined,
  };
}

// resource_type → schema.org type, as the standard's vocab/resource_type.json maps it
const SCHEMA_TYPES: Record<string, string> = {
  dataset: "Dataset",
  software: "SoftwareApplication",
  service: "Service",
  document: "CreativeWork",
};

function contactToSchemaOrg(c: CatalogRecord["contact"][number]) {
  if (c.name) {
    return {
      "@type": "Person",
      name: c.name,
      ...(c.orcid && { sameAs: c.orcid }),
      ...(c.email && { email: c.email }),
      ...(c.organization && {
        affiliation: {
          "@type": "Organization",
          name: c.organization,
          ...(c.ror && { sameAs: c.ror }),
        },
      }),
    };
  }
  return {
    "@type": "Organization",
    name: c.organization,
    ...(c.ror && { sameAs: c.ror }),
    ...(c.email && { email: c.email }),
    ...(c.url && { url: c.url }),
  };
}

function authorToSchemaOrg(
  a: NonNullable<CatalogRecord["citation"]>["authors"][number],
) {
  return "organization" in a
    ? {
        "@type": "Organization",
        name: a.organization,
        ...(a.ror && { sameAs: a.ror }),
      }
    : {
        "@type": "Person",
        name: authorName(a),
        familyName: a.family,
        ...(a.given && { givenName: a.given }),
        ...(a.orcid && { sameAs: a.orcid }),
      };
}

// schema.org/Dataset JSON-LD, mapped from the CDH record (Google Dataset Search friendly).
export function datasetJsonLd(
  d: CatalogRecord,
  url: string,
  catalogUrl: string,
) {
  const boxes = normalizeBboxes(d.spatial?.bbox) ?? [];
  const variables = d.structures.flatMap((s) => s.variables);
  const withRole = (role: string) =>
    d.contact.filter((c) => c.roles.includes(role)).map(contactToSchemaOrg);
  // The credited authors in citation order, else the producers
  const creators =
    d.citation && d.citation.authors.length > 0
      ? d.citation.authors.map(authorToSchemaOrg)
      : withRole("producer");
  const maintainers = withRole("maintainer");
  const contributors = withRole("processor");
  // Sources this record derives from: a Hub record (its pinned release when
  // given) or a storage URL
  const sources = d.processing.flatMap((step) =>
    step.derived_from.flatMap((src) =>
      src.id
        ? [
            new URL(
              `${src.version ? `${src.id}_${src.version}` : src.id}/`,
              catalogUrl,
            ).href,
          ]
        : src.url
          ? [src.url]
          : [],
    ),
  );
  // Publications to cite alongside the dataset: DOI URL, else citation text
  const publications = d.related_publications.flatMap((p) =>
    p.doi
      ? [`https://doi.org/${p.doi}`]
      : p.citation
        ? [
            `${p.citation.authors.map(authorName).join(", ")} (${p.citation.date}). ${p.citation.title ?? ""}`.trim(),
          ]
        : [],
  );
  const partOf = [
    d.parent && new URL(`${d.parent}/`, catalogUrl).href,
    d.series && {
      "@type": "CreativeWorkSeries",
      name: d.series.name,
      ...(d.series.url && { url: d.series.url }),
    },
  ].filter(Boolean);
  // Named places (with M49/ISO codes) alongside the bbox GeoShapes
  const places = [
    ...(d.spatial?.geography ?? []).map((g) => {
      const c = geography(g);
      return {
        "@type": "Place",
        name: c?.label ?? humanize(g),
        ...(c && {
          identifier: [
            { "@type": "PropertyValue", propertyID: "UN M49", value: c.code },
            ...(c.iso3
              ? [
                  {
                    "@type": "PropertyValue",
                    propertyID: "ISO 3166-1 alpha-3",
                    value: c.iso3,
                  },
                ]
              : []),
          ],
        }),
      };
    }),
    // schema.org box is "minLat minLon maxLat maxLon"
    ...boxes.map((b) => ({
      "@type": "Place",
      geo: { "@type": "GeoShape", box: `${b[1]} ${b[0]} ${b[3]} ${b[2]}` },
    })),
  ];
  // Distributions stay coarse, and only URLs a consumer can fetch directly
  // (e.g. a Zarr root). Templated and indexed assets have no such URL — their
  // prefix isn't retrievable — so their file lists and indexes stand in.
  const distributions = [
    ...d.data.flatMap((asset) =>
      asset.href_template || asset.file_index.length > 0
        ? []
        : asset.locations
            .filter((loc) => loc.url.startsWith("http"))
            .map((loc) => ({
              "@type": "DataDownload",
              name: asset.description ?? asset.name,
              contentUrl: loc.url,
              ...(asset.media_type && { encodingFormat: asset.media_type }),
              ...(asset.file_size !== undefined && {
                contentSize: formatBytes(asset.file_size),
              }),
            })),
    ),
    ...(d.data.some((a) => a.href_template)
      ? [
          {
            "@type": "DataDownload",
            name: "STAC Collection (machine-readable index of all files)",
            contentUrl: stacCollectionUrl(d.id),
            encodingFormat: "application/json",
          },
        ]
      : []),
    // The site's list of every templated file, as CSV
    ...d.data.flatMap((asset) =>
      resolveTemplate(d, asset)
        ? [
            {
              "@type": "DataDownload",
              name: `${asset.name}: list of all files (CSV)`,
              contentUrl: new URL(`${asset.name}-files.csv`, url).href,
              encodingFormat: "text/csv",
            },
          ]
        : [],
    ),
    // Single-file indexes (not an Icechunk repo or a prefix)
    ...d.data.flatMap((asset) =>
      asset.file_index.flatMap((ix) => {
        const href = ix.locations.find((l) => l.url.startsWith("http"))?.url;
        return href && ix.format !== "icechunk" && !href.endsWith("/")
          ? [
              {
                "@type": "DataDownload",
                name: `${asset.name}: ${ix.title ?? `${ix.format} file index`}`,
                contentUrl: href,
                ...(ix.format === "cdh-inventory" && {
                  encodingFormat: "text/csv",
                }),
              },
            ]
          : [];
      }),
    ),
  ];

  return {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPES[d.resource_type] ?? "Dataset",
    "@id": url,
    name: d.title,
    description: d.description,
    url,
    identifier: d.doi ? [`https://doi.org/${d.doi}`, d.id] : [d.id],
    ...(d.doi && { sameAs: `https://doi.org/${d.doi}` }),
    license: licenseUrl(d.license) ?? d.license,
    // "Free" in the Dataset Search sense: openly retrievable, no gate
    isAccessibleForFree: (d.access ?? "public") === "public",
    ...(d.attribution && { creditText: d.attribution }),
    ...(d.access_note && { conditionsOfAccess: d.access_note }),
    version: d.version,
    dateCreated: d.created,
    dateModified: d.updated,
    keywords: d.keywords.map((k) =>
      typeof k === "string"
        ? k
        : {
            "@type": "DefinedTerm",
            name: k.term,
            ...(k.uri && { url: k.uri }),
            ...(k.scheme && { inDefinedTermSet: k.scheme }),
          },
    ),
    // Commodities as AGROVOC-linked subjects, via the CDH controlled vocab
    ...(d.commodities.length > 0 && {
      about: d.commodities.map((id) => {
        const c = commodity(id);
        return {
          "@type": "DefinedTerm",
          name: c?.label ?? humanize(id),
          ...(c?.code && { termCode: c.code }),
          ...(c?.uri && { url: c.uri }),
          ...(c && { inDefinedTermSet: VOCAB_URL }),
        };
      }),
    }),
    ...(creators.length > 0 && { creator: creators }),
    ...(maintainers.length > 0 && { maintainer: maintainers }),
    ...(contributors.length > 0 && { contributor: contributors }),
    ...(d.citation?.publisher && {
      publisher: { "@type": "Organization", name: d.citation.publisher },
    }),
    ...(d.funding.length > 0 && {
      funder: d.funding.map((f) => ({
        "@type": "Organization",
        name: f.name,
        ...(f.url && { url: f.url }),
      })),
    }),
    ...(places.length > 0 && { spatialCoverage: places }),
    // schema.org accepts reduced-precision dates; ".." is its open-ended marker
    ...(d.temporal && {
      temporalCoverage:
        "date" in d.temporal
          ? d.temporal.date
          : `${d.temporal.start_date}/${d.temporal.end_date ?? ".."}`,
    }),
    ...(variables.length > 0 && {
      variableMeasured: variables.map((v) => ({
        "@type": "PropertyValue",
        name: v.name,
        ...(v.description && { description: v.description }),
        ...(v.unit && { unitText: v.unit }),
      })),
    }),
    ...(distributions.length > 0 && { distribution: distributions }),
    ...(publications.length > 0 && { citation: publications }),
    ...(sources.length > 0 && { isBasedOn: sources }),
    ...(partOf.length > 0 && { isPartOf: partOf }),
    includedInDataCatalog: { "@type": "DataCatalog", "@id": catalogUrl },
  };
}
