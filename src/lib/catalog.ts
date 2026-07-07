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
    updated: d.updated ?? d.created ?? "",
  };
}

export type DatasetSummary = ReturnType<typeof summarize>;
