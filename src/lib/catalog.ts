// Shared shaping of CDH catalog records for cards, facets, and JSON-LD.
import type { CollectionEntry } from "astro:content";

const FORMAT_LABELS: Record<string, string> = { zarr: "Zarr", cogs: "COG" };

export function humanize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replaceAll("-", " ");
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
    coverage: d.spatial?.geography.map(humanize).join(", ") || undefined,
    // Short form for card meta rows — full label lives on the detail page
    resolution: d.spatial?.resolution[0]?.label?.split(" (")[0],
    formats: d.data.map((a) => FORMAT_LABELS[a.name] ?? a.name),
    domains: d.cdh?.domain ?? [],
    geographies: d.spatial?.geography ?? [],
    bbox: normalizeBbox(d.spatial?.bbox),
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

export function citationText(d: CatalogRecord) {
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
  ]
    .filter(Boolean)
    .join(" ");
}

export function bibtex(d: CatalogRecord) {
  const c = d.citation;
  if (!c) return undefined;
  const key = `${d.id.replaceAll("-", "_")}_${(c.date ?? "").slice(0, 4)}`;
  const lines = [
    `  title     = {${c.title}}`,
    c.authors.length > 0 && `  author    = {${c.authors.join(" and ")}}`,
    c.date && `  year      = {${c.date.slice(0, 4)}}`,
    c.publisher && `  publisher = {${c.publisher}}`,
    d.doi ? `  doi       = {${d.doi}}` : c.url && `  url       = {${c.url}}`,
  ].filter(Boolean);
  return `@misc{${key},\n${lines.join(",\n")}\n}`;
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
  const distributions = d.data.flatMap((asset) =>
    asset.locations
      .filter((loc) => loc.url.startsWith("http"))
      .map((loc) => ({
        "@type": "DataDownload",
        name: asset.description ?? asset.name,
        contentUrl: loc.url,
        ...(asset.media_type && { encodingFormat: asset.media_type }),
        ...(asset.file_size && { contentSize: asset.file_size }),
      })),
  );

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
    ...(creators.length > 0 && { creator: creators.map(contactToSchemaOrg) }),
    ...(bbox && {
      spatialCoverage: {
        "@type": "Place",
        geo: {
          "@type": "GeoShape",
          // schema.org box is "minLat minLon maxLat maxLon"
          box: `${bbox[1]} ${bbox[0]} ${bbox[3]} ${bbox[2]}`,
        },
      },
    }),
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
