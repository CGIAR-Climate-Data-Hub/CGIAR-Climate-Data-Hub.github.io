// Shared shaping of CDH catalog records for cards, facets, and JSON-LD.
import type { CollectionEntry } from "astro:content";
import {
  commodity,
  commodityWithParents,
  geography,
  geographyBboxes,
  geographyWithParents,
  isCommodityGroup,
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

export function humanize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replaceAll("-", " ");
}

// Canonical UN M49 label ("Sub-Saharan Africa"), falling back for unknown ids
export function geoLabel(id: string) {
  return geography(id)?.label ?? humanize(id);
}

export function commodityLabel(id: string) {
  return commodity(id)?.label ?? humanize(id);
}

// Version chain per the standard (§4.7): records link backward via
// previous_version; successors come from inverting those edges. Returns the
// record's full chain newest-first. Chain integrity (dangling ids, forks,
// cycles) is validated at catalog submission, not here — a bad edge just
// ends the walk.
export function versionChain(
  id: string,
  entries: CollectionEntry<"catalog">[],
) {
  const byId = new Map(entries.map((e) => [e.data.id, e]));
  const successor = new Map(
    entries.flatMap((e) =>
      e.data.previous_version
        ? [[e.data.previous_version, e.data.id] as const]
        : [],
    ),
  );

  // Walk forward to the newest release, then collect backward from there
  const seen = new Set([id]);
  let head = id;
  while (successor.has(head) && !seen.has(successor.get(head) as string)) {
    head = successor.get(head) as string;
    seen.add(head);
  }
  const chain: CollectionEntry<"catalog">[] = [];
  const visited = new Set<string>();
  let cursor: string | undefined = head;
  while (cursor && byId.has(cursor) && !visited.has(cursor)) {
    visited.add(cursor);
    chain.push(byId.get(cursor) as CollectionEntry<"catalog">);
    cursor = byId.get(cursor)?.data.previous_version;
  }
  return chain;
}

// A URL that targets a Hub record page — relative or absolute — resolves to
// its record id. Callers must check the id against the catalog; that lookup
// is the real guard against false positives.
export function hubRecordId(url: string) {
  return url.match(/^(?:https?:\/\/[^/]+)?\/catalog\/([^/]+)\/?$/)?.[1];
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
    // Tags plus their M49 ancestors, so filtering by a region rolls up
    geographies: [
      ...new Set((d.spatial?.geography ?? []).flatMap(geographyWithParents)),
    ],
    // Explicit extent, else derived from geography tags for spatial search
    bboxes:
      normalizeBboxes(d.spatial?.bbox)
      ?? geographyBboxes(d.spatial?.geography ?? []),
    series: d.series?.name,
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

// Simple SPDX ids resolve to a canonical page. Submission also accepts
// compound expressions ("Apache-2.0 OR MIT", "… WITH …") and custom
// LicenseRef-* — neither has an spdx.org page, so those render as plain text.
export function licenseUrl(license: string) {
  return /^(?!LicenseRef-)[A-Za-z0-9.+-]+$/.test(license)
    ? `https://spdx.org/licenses/${license}.html`
    : undefined;
}

// Records store one bbox or a list of them; normalize to a list.
export function normalizeBboxes(bbox?: number[] | number[][]) {
  if (!bbox || bbox.length === 0) return undefined;
  return (Array.isArray(bbox[0]) ? bbox : [bbox]) as number[][];
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
    // The version pins the citation: the current release's Hub URL rolls
    // forward to newer releases, so the text must record what was used
    d.version && `Version ${d.version}.`,
    c.publisher && `${c.publisher}.`,
    link,
    recordUrl && `${VIA}, ${recordUrl}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

// One text citation per style — the same fields shuffled per convention.
// citationText (above) stays the generic form used in JSON-LD.
export function citationFormats(d: CatalogRecord, recordUrl?: string) {
  const c = d.citation;
  if (!c) return [];
  const authors = c.authors.join(", ");
  const year = (c.date ?? "").slice(0, 4);
  const link = d.doi ? `https://doi.org/${d.doi}` : c.url;
  const via = recordUrl ? `${VIA}, ${recordUrl}.` : undefined;
  const join = (parts: (string | false | undefined)[]) =>
    parts.filter(Boolean).join(" ");
  return [
    {
      id: "apa",
      label: "APA",
      text: join([
        authors && `${authors}`,
        year && `(${year}).`,
        `${c.title}`,
        d.version ? `(Version ${d.version}) [Data set].` : "[Data set].",
        c.publisher && `${c.publisher}.`,
        link,
        via,
      ]),
    },
    {
      id: "harvard",
      label: "Harvard",
      text: join([
        authors && `${authors}`,
        year && `(${year})`,
        `${c.title} [Data set].`,
        d.version && `Version ${d.version}.`,
        c.publisher && `${c.publisher}.`,
        link && `Available at: ${link}.`,
        via,
      ]),
    },
    {
      id: "chicago",
      label: "Chicago",
      text: join([
        // Initials already end with a period — don't double it
        authors && (authors.endsWith(".") ? authors : `${authors}.`),
        year && `${year}.`,
        `“${c.title}.”`,
        d.version && `Version ${d.version}.`,
        c.publisher && `${c.publisher}.`,
        link && `${link}.`,
        via,
      ]),
    },
  ];
}

export function bibtex(d: CatalogRecord, recordUrl?: string) {
  const c = d.citation;
  if (!c) return undefined;
  const key = `${d.id.replaceAll("-", "_")}_${(c.date ?? "").slice(0, 4)}`;
  const lines = [
    `  title     = {${c.title}}`,
    c.authors.length > 0 && `  author    = {${c.authors.join(" and ")}}`,
    c.date && `  year      = {${c.date.slice(0, 4)}}`,
    d.version && `  version   = {${d.version}}`,
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
  const boxes = normalizeBboxes(d.spatial?.bbox) ?? [];
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
    // "Free" in the Dataset Search sense: openly retrievable, no gate
    isAccessibleForFree: (d.access ?? "open") === "open",
    ...(d.access_note && { conditionsOfAccess: d.access_note }),
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
    ...(d.funding.length > 0 && {
      funder: d.funding.map((f) => ({
        "@type": "Organization",
        name: f.name,
        ...(f.url && { url: f.url }),
      })),
    }),
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
      for (const b of boxes)
        places.push({
          "@type": "Place",
          geo: {
            "@type": "GeoShape",
            // schema.org box is "minLat minLon maxLat maxLon"
            box: `${b[1]} ${b[0]} ${b[3]} ${b[2]}`,
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
