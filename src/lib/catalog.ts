// Shared shaping of CDH catalog records for cards, facets, and JSON-LD.
import type { CollectionEntry } from "astro:content";
import formatVocab from "@/assets/format-vocab.json";
import { authorName, type Citable, citationText } from "@/lib/citation";
import {
  axisValues,
  DURATION,
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

// Collections aren't published yet: flip this once the pipeline writes them
// and every STAC link on the site comes back
const STAC_LIVE = false;

export function stacCollectionUrl(id: string) {
  return STAC_LIVE ? `${STAC_ROOT}/${id}/collection.json` : undefined;
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
  const m = dim.step.match(DURATION);
  const days = m ? Number(m[3] ?? 0) * 7 + Number(m[4] ?? 0) : 0;
  return days > 0 ? days : undefined;
}

export type Asset = CatalogRecord["data"][number];

// An asset's or index's HTTPS address, when it has one
export const httpUrl = (locations: { url: string }[]) =>
  locations.find((l) => l.url.startsWith("http"))?.url;

// The structures an asset holds; its template tokens resolve against them.
// With one structure an asset may omit the list: it holds that one
export const heldStructures = (d: CatalogRecord, asset: Asset) =>
  asset.structures.length > 0
    ? d.structures.filter((s) => asset.structures.includes(s.name))
    : d.structures.slice(0, 1);

// A template token's values in one structure: its dimension's, or the
// variable names for {variable}. A daily axis also carries a date range, so
// the picker can show a native date field instead of a list spanning decades.
function tokenField(s: CatalogRecord["structures"][number], name: string) {
  const dim = s.dimensions.find((x) => x.name === name);
  const values = dim
    ? axisValues(dim)
    : name === "variable"
      ? s.variables.map((v) => v.name)
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
}

// An asset template's tokens with every value each takes in any held
// structure, the values per structure (structures can share a dimension
// name but not its values), and one real file from the first structure.
export function resolveTemplate(d: CatalogRecord, asset: Asset) {
  const template = asset.href_template;
  if (!template) return undefined;
  const names = tokenNames(template);
  // A structure missing a token can't name a file
  const combos = heldStructures(d, asset)
    .map((s) => names.map((name) => tokenField(s, name)))
    .filter((fields) => fields.every((f) => f.values.length > 0));
  if (combos.length === 0) return undefined;
  const fields = names.map((name, i) => {
    const per = combos.map((c) => c[i]);
    return {
      name,
      values: [...new Set(per.flatMap((f) => f.values))],
      labels: Object.assign({}, ...per.map((f) => f.labels)) as Record<
        string,
        string
      >,
      date: per[0].date,
    };
  });
  const first = Object.fromEntries(combos[0].map((f) => [f.name, f.values[0]]));
  return {
    fields,
    file: fillTemplate(template, first),
    combos: combos.map((c) =>
      Object.fromEntries(c.map((f) => [f.name, f.values])),
    ),
  };
}

// One row per distinct URL. Only serialize CSV when requested, not for counts.
export function templateInventory(
  d: CatalogRecord,
  asset: Asset,
  resolved = resolveTemplate(d, asset),
) {
  const { href_template: template, locations } = asset;
  if (!template || !resolved) return undefined;
  const base = httpUrl(locations) ?? locations[0]?.url;
  const files = new Map<string, string[]>();
  let columns: string[] = [];
  // Each structure names its own files; one two structures share counts once
  for (const combo of resolved.combos) {
    const fields = Object.entries(combo).map(([name, values]) => ({
      name,
      ...fileCoordinates(template, name, values),
    }));
    columns = fields.filter((f) => f.column).map((f) => f.name);
    let rows: string[][] = [[]];
    for (const f of fields)
      rows = rows.flatMap((row) => f.values.map((v) => [...row, v]));
    for (const row of rows) {
      const pick = Object.fromEntries(fields.map((f, i) => [f.name, row[i]]));
      const href = `${base ?? ""}${fillTemplate(template, pick)}`;
      files.set(href, [href, ...row.filter((_, i) => fields[i].column)]);
    }
  }
  return {
    count: files.size,
    get csv() {
      const header = ["href", ...columns];
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
const formatId = (mediaType?: string) =>
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

export const HORIZONTAL = ["xy", "x", "y"];

// A grid step in words. Degrees convert exactly to arc-minutes or arc-seconds;
// the km figure is approximate and holds only at the equator (111.32 km/°)
function spacingLabel(step: number, unit: string) {
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

// Keyword strings, with ontology terms reduced to their label
const terms = (d: CatalogRecord) =>
  d.keywords.map((k) => (typeof k === "string" ? k : k.term));

export function summarize(entry: CollectionEntry<"catalog">) {
  const d = entry.data;
  for (const id of d.commodities)
    if (!commodity(id))
      console.warn(`${d.id}: commodity "${id}" is not in the vocabulary`);
  const commodities = [...new Set(d.commodities.flatMap(commodityWithParents))];
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
    keywords: terms(d),
    coverage: d.spatial?.geography.map(geoLabel).join(", ") || undefined,
    // Short form for card meta rows — full label lives on the detail page
    resolution: gridSpacings(d)[0]?.split(" (")[0],
    temporal: temporalText(d.temporal)?.main,
    domains: d.cdh?.domain ?? [],
    // Tags plus their broader concepts, so filtering by a group rolls up;
    // the group tier of the closure feeds the facet
    commodities,
    commodityGroups: commodities.filter(isCommodityGroup),
    // Tags plus their M49 ancestors, so filtering by a region rolls up —
    // except the "world" root, which stays only when explicitly tagged:
    // the catalog filter reads world as "global, matches every region",
    // and every chain of ancestors ends at world
    geographies: [
      ...new Set((d.spatial?.geography ?? []).flatMap(geographyWithParents)),
    ].filter(
      (g) => g !== "world" || (d.spatial?.geography ?? []).includes("world"),
    ),
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

// A URL's last path segment, or its host when the path is empty
export function lastSegment(url: string) {
  const u = new URL(url);
  return u.pathname.split("/").filter(Boolean).pop() ?? u.host;
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
const updateLabel = (f: string) => `updated ${UPDATE_LABELS[f] ?? f}`;

// "P3M" → "every 3 months" (steps are pipeline-validated ISO 8601 durations)
export function stepLabel(step: string) {
  if (STEP_LABELS[step]) return STEP_LABELS[step];
  const m = step.match(DURATION) ?? [];
  const parts = [
    "year",
    "month",
    "week",
    "day",
    "hour",
    "minute",
    "second",
  ].flatMap((unit, i) =>
    m[i + 1] ? `${m[i + 1]} ${unit}${+m[i + 1] > 1 ? "s" : ""}` : [],
  );
  return `every ${parts.join(" ")}`;
}

// Dataset Markdown for llms-full.txt and record twins: the derived links and
// labels the raw record can't carry. The twin appends the record itself.
export function datasetMd(
  d: CatalogRecord,
  site: URL | undefined,
  yaml?: string,
) {
  const abs = (path: string) => new URL(path, site).href;
  const slug = recordSlug(d);
  const stac = stacCollectionUrl(d.id);
  const citation = citable(d);
  const temporal = temporalText(d.temporal);
  const facts = [
    `URL: ${abs(`/catalog/${slug}/`)}`,
    `Metadata (JSON): ${abs(`/catalog/${slug}.json`)}`,
    d.data.length && stac && `STAC collection: ${stac}`,
    ...d.data.map(
      (a) =>
        a.href_template
        && resolveTemplate(d, a)
        && `File list (${a.name}, CSV): ${abs(`/catalog/${slug}/${a.name}-files.csv`)}`,
    ),
    temporal
      && `Temporal coverage: ${[temporal.main, temporal.sub].filter(Boolean).join(", ")}`,
    citation
      && `Cite: ${citationText(citation, abs(`/catalog/${versionedSlug(d)}/`))}`,
  ]
    .filter(Boolean)
    .map((f) => `- ${f}`);

  return [
    facts.join("\n"),
    d.description.trim(),
    yaml && `\`\`\`yaml\n${yaml.trim()}\n\`\`\``,
  ]
    .filter(Boolean)
    .join("\n\n");
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
  const stac = stacCollectionUrl(d.id);
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
    ...(stac && d.data.some((a) => a.href_template)
      ? [
          {
            "@type": "DataDownload",
            name: "STAC Collection (machine-readable index of all files)",
            contentUrl: stac,
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
        const href = httpUrl(ix.locations);
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
    // Commodities as FAO ICC/WCA-coded subjects, via the CDH controlled vocab
    ...(d.commodities.length > 0 && {
      about: d.commodities.map((id) => {
        const c = commodity(id);
        return {
          "@type": "DefinedTerm",
          name: c?.label ?? humanize(id),
          ...(c?.code && { termCode: c.code }),
          ...((c?.uri ?? c?.agrovoc) && { url: c?.uri ?? c?.agrovoc }),
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
