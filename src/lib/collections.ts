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

// "20 min" / "2 hrs" → ISO 8601 duration for schema.org timeRequired
export function isoDuration(time: string) {
  const match = time.match(/(\d+)\s*(min|hr|hour)/);
  if (!match) return undefined;
  return match[2] === "min" ? `PT${match[1]}M` : `PT${match[1]}H`;
}
