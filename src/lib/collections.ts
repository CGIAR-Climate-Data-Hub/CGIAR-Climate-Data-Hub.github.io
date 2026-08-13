// Shared ordering/grouping for the docs collections.
import { type CollectionEntry, getCollection } from "astro:content";
import type { Citable } from "@/lib/citation";
import { SITE_PUBLISHER_NAME } from "@/site.config";

// Markdown tutorials and notebook tutorials share a schema and render the
// same way — every consumer treats them as one collection.
export async function allTutorials() {
  return [
    ...(await getCollection("tutorials")),
    ...(await getCollection("notebookTutorials")),
  ];
}

export type CitablePage = {
  id: string;
  data: { title: string; author?: string; updated: Date };
};

// Citation shape for docs pages the hub publishes itself: the page url is the
// citation url, so callers pass no viaUrl ("accessed through") clause.
export function pageCitable(
  e: CitablePage,
  url: string,
  genre: string,
): Citable {
  return {
    authors: e.data.author ? [e.data.author] : [],
    date: e.data.updated.toISOString().slice(0, 10),
    genre,
    key: e.id,
    publisher: SITE_PUBLISHER_NAME,
    title: e.data.title,
    url,
  };
}

export const WIKI_SECTIONS = [
  "Standards",
  "Methods",
  "Concepts",
  "Governance",
  "Reference",
] as const;

export const WIKI_SECTION_LABELS: Partial<
  Record<(typeof WIKI_SECTIONS)[number], string>
> = { Standards: "Data standards" };

export function groupWikis(entries: CollectionEntry<"wikis">[]) {
  return WIKI_SECTIONS.map((section) => ({
    section,
    entries: entries
      .filter((e) => e.data.section === section)
      .sort(
        (a, b) =>
          (a.data.order ?? 99) - (b.data.order ?? 99)
          || a.data.title.localeCompare(b.data.title),
      ),
  })).filter((g) => g.entries.length > 0);
}
