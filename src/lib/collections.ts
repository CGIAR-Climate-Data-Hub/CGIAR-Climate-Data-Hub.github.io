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
  data: { title: string; author: string[]; updated: Date };
};

export function pageCitable(e: CitablePage, url: string): Citable {
  return {
    authors: e.data.author,
    date: e.data.updated.toISOString().slice(0, 10),
    key: e.id,
    publisher: SITE_PUBLISHER_NAME,
    title: e.data.title,
    url,
  };
}

export const WIKI_GROUPS = [
  // Sidebar groups render in this order — hub-level docs lead
  "The Hub",
  "Data standards",
  "Methods",
  "Concepts",
  "Reference",
] as const;

export function groupWikis(entries: CollectionEntry<"wikis">[]) {
  return WIKI_GROUPS.map((label) => ({
    label,
    entries: entries
      .filter((e) => e.data.group === label)
      .sort(
        (a, b) =>
          (a.data.order ?? 99) - (b.data.order ?? 99)
          || a.data.title.localeCompare(b.data.title),
      ),
  })).filter((g) => g.entries.length > 0);
}
