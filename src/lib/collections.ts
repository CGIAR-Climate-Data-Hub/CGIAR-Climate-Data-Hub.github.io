// Shared ordering/grouping for the docs collections.
import type { CollectionEntry } from "astro:content";

export const WIKI_SECTIONS = [
  "Standards",
  "Methods",
  "Concepts",
  "Governance",
  "Reference",
] as const;

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
