// Shared shaping of CDH catalog records for cards, facets, and JSON-LD.
import type { CollectionEntry } from "astro:content";
import {
  commodity,
  geography,
  geographyBbox,
  geographyWithParents,
  VOCAB_URL,
} from "@/lib/vocab";
import { SITE_NAME } from "@/site.config";

const VIA = `Accessed through the CGIAR ${SITE_NAME}`;

// STAC catalogs are derived from these records by the publishing pipeline,
// so records never store STAC URLs — the site assumes this layout instead.
// If the pipeline publishes elsewhere, this is the one place to change.
const STAC_ROOT = "https://digital-atlas.s3.amazonaws.com/cdh/stac";

export function stacCollectionUrl(id: string) {
  return `${STAC_ROOT}/${id}/collection.json`;
}

// Fill an asset's href_template ("glw4-2020-{species}.tif") with the first
// value of each dimension ({variable} maps to the first variable name) to
// name one real file for example snippets. Undefined when unresolvable.
export function exampleTemplateFile(d: CatalogRecord, template: string) {
  let file = template;
  for (const [, name] of template.matchAll(/\{(\w+)\}/g)) {
    const value =
      d.dimensions.find((dim) => dim.name === name)?.values[0]
      ?? (name === "variable" ? d.variables[0]?.name : undefined);
    if (!value) return undefined;
    file = file.replaceAll(`{${name}}`, value);
  }
  return file;
}

const FORMAT_LABELS: Record<string, string> = { zarr: "Zarr", cogs: "COG" };

export function humanize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replaceAll("-", " ");
}

// Canonical UN M49 label ("Sub-Saharan Africa"), falling back for unknown ids
export function geoLabel(id: string) {
  return geography(id)?.label ?? humanize(id);
}

export function summarize(entry: CollectionEntry<"catalog">) {
  const d = entry.data;
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    type: d.spatial ? ("spatial" as const) : ("tabular" as const),
    license: d.license,
    keywords: d.keywords.map((k) => (typeof k === "string" ? k : k.term)),
    coverage: d.spatial?.geography.map(geoLabel).join(", ") || undefined,
    // Short form for card meta rows — full label lives on the detail page
    resolution: d.spatial?.resolution[0]?.label?.split(" (")[0],
    formats: d.data.map((a) => FORMAT_LABELS[a.name] ?? a.name),
    temporal: temporalText(d.temporal)?.main,
    temporalYears: d.temporal
      ? [
          +d.temporal.start_date.slice(0, 4),
          +(d.temporal.end_date ?? d.temporal.start_date).slice(0, 4),
        ]
      : undefined,
    domains: d.cdh?.domain ?? [],
    // Tags plus their M49 ancestors, so filtering by a region rolls up
    geographies: [
      ...new Set((d.spatial?.geography ?? []).flatMap(geographyWithParents)),
    ],
    // Explicit extent, else derived from geography tags for spatial search
    bbox:
      normalizeBbox(d.spatial?.bbox)
      ?? geographyBbox(d.spatial?.geography ?? []),
    updated: d.updated ?? d.created ?? "",
  };
}

export type DatasetSummary = ReturnType<typeof summarize>;

export type CatalogRecord = CollectionEntry<"catalog">["data"];

const LICENSE_URLS: Record<string, string> = {
  "CC-BY-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC-BY-SA-4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
};

// Records should carry SPDX ids, which all resolve to a canonical page;
// anything non-SPDX-shaped gets no link.
export function licenseUrl(license: string) {
  return /^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(license)
    ? `https://spdx.org/licenses/${license}.html`
    : undefined;
}

// Records store one bbox or a list of them; the site only maps the first.
export function normalizeBbox(bbox?: number[] | number[][]) {
  if (!bbox || bbox.length === 0) return undefined;
  return (Array.isArray(bbox[0]) ? bbox[0] : bbox) as number[];
}

// recordUrl appends an "accessed through" clause pointing at the hub's
// record page; omit it where only the original citation belongs (JSON-LD).
export function citationText(d: CatalogRecord, recordUrl?: string) {
  const c = d.citation;
  if (!c) return undefined;
  const authors = c.authors.join(", ");
  const link = d.doi ? `https://doi.org/${d.doi}` : c.url;
  return [
    authors,
    c.date && `(${c.date})`,
    `${c.title}.`,
    c.publisher && `${c.publisher}.`,
    link,
    recordUrl && `${VIA}, ${recordUrl}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function bibtex(d: CatalogRecord, recordUrl?: string) {
  const c = d.citation;
  if (!c) return undefined;
  const key = `${d.id.replaceAll("-", "_")}_${(c.date ?? "").slice(0, 4)}`;
  const lines = [
    `  title     = {${c.title}}`,
    c.authors.length > 0 && `  author    = {${c.authors.join(" and ")}}`,
    c.date && `  year      = {${c.date.slice(0, 4)}}`,
    c.publisher && `  publisher = {${c.publisher}}`,
    d.doi ? `  doi       = {${d.doi}}` : c.url && `  url       = {${c.url}}`,
    recordUrl && `  note      = {${VIA}, ${recordUrl}}`,
  ].filter(Boolean);
  return `@misc{${key},\n${lines.join(",\n")}\n}`;
}

const STEP_LABELS: Record<string, string> = {
  P1Y: "annual",
  P1M: "monthly",
  P10D: "10-daily",
  P1D: "daily",
  PT1H: "hourly",
};

// ISO 8601 duration → approximate days, to size the extent against the step
function stepDays(step: string) {
  const m = step.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(\d+)H)?$/);
  if (!m) return undefined;
  return (
    +(m[1] ?? 0) * 365 + +(m[2] ?? 0) * 30 + +(m[3] ?? 0) + +(m[4] ?? 0) / 24
  );
}

// An extent that fits inside one step is a single time slice — a static
// snapshot, not a series — so render it as its reference year.
export function temporalText(t: CatalogRecord["temporal"]) {
  if (!t) return undefined;
  const days =
    (Date.parse(t.end_date ?? t.start_date) - Date.parse(t.start_date)) / 864e5;
  const step = t.resolution?.step;
  const single = step ? days <= (stepDays(step) ?? 0) : days <= 366;
  const year = (date: string) => date.slice(0, 4);
  return {
    main: single
      ? year(t.start_date)
      : `${year(t.start_date)} – ${t.end_date ? year(t.end_date) : "present"}`,
    sub: single
      ? (t.resolution?.note ?? "static snapshot")
      : [step && (STEP_LABELS[step] ?? step), t.resolution?.note]
          .filter(Boolean)
          .join(" · "),
  };
}

function contactToSchemaOrg(c: CatalogRecord["contact"][number]) {
  if (c.name) {
    return {
      "@type": "Person",
      name: c.name,
      ...(c.email && { email: c.email }),
      ...(c.organization && {
        affiliation: { "@type": "Organization", name: c.organization },
      }),
    };
  }
  return {
    "@type": "Organization",
    name: c.organization,
    ...(c.url && { url: c.url }),
  };
}

// schema.org/Dataset JSON-LD, mapped from the CDH record (Google Dataset Search friendly).
export function datasetJsonLd(
  d: CatalogRecord,
  url: string,
  catalogUrl: string,
) {
  const bbox = normalizeBbox(d.spatial?.bbox);
  const cite = citationText(d);
  const creators = d.contact.filter((c) => c.roles.includes("producer"));
  // Distributions stay coarse, and only URLs a consumer can fetch directly
  // (e.g. a Zarr root). Templated assets have no such URL — their prefix
  // isn't retrievable — so the STAC Collection file index represents them.
  const distributions = [
    ...d.data.flatMap((asset) =>
      asset.href_template
        ? []
        : asset.locations
            .filter((loc) => loc.url.startsWith("http"))
            .map((loc) => ({
              "@type": "DataDownload",
              name: asset.description ?? asset.name,
              contentUrl: loc.url,
              ...(asset.media_type && { encodingFormat: asset.media_type }),
              ...(asset.file_size && { contentSize: asset.file_size }),
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
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": url,
    name: d.title,
    description: d.description,
    url,
    identifier: d.doi ? [`https://doi.org/${d.doi}`, d.id] : [d.id],
    ...(d.doi && { sameAs: `https://doi.org/${d.doi}` }),
    license: LICENSE_URLS[d.license] ?? d.license,
    isAccessibleForFree: true,
    ...(d.version && { version: d.version }),
    ...(d.created && { dateCreated: d.created }),
    ...(d.updated && { dateModified: d.updated }),
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
    ...(creators.length > 0 && { creator: creators.map(contactToSchemaOrg) }),
    ...(() => {
      // Named places (with M49/ISO codes) alongside the bbox GeoShape
      const places: object[] = (d.spatial?.geography ?? []).map((g) => {
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
      });
      if (bbox)
        places.push({
          "@type": "Place",
          geo: {
            "@type": "GeoShape",
            // schema.org box is "minLat minLon maxLat maxLon"
            box: `${bbox[1]} ${bbox[0]} ${bbox[3]} ${bbox[2]}`,
          },
        });
      return places.length > 0 ? { spatialCoverage: places } : {};
    })(),
    ...(d.temporal && {
      temporalCoverage: d.temporal.end_date
        ? `${d.temporal.start_date}/${d.temporal.end_date}`
        : d.temporal.start_date,
    }),
    ...(d.variables.length > 0 && {
      variableMeasured: d.variables.map((v) => ({
        "@type": "PropertyValue",
        name: v.name,
        ...(v.description && { description: v.description }),
        ...(v.unit && { unitText: v.unit }),
      })),
    }),
    ...(distributions.length > 0 && { distribution: distributions }),
    ...(cite && { citation: cite }),
    includedInDataCatalog: { "@type": "DataCatalog", "@id": catalogUrl },
  };
}
