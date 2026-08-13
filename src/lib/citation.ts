// Citation strings for anything citable: catalog records, tutorials, wikis.
// Callers map their own frontmatter into Citable (see citable() in
// src/lib/catalog.ts for the record adapter), so nothing here knows about
// collections or schemas — just the seven fields a citation needs.
import { SITE_PUBLISHER_NAME } from "@/site.config";

export interface Citable {
  title: string;
  // Empty means the hub itself published it — cited as a corporate author
  authors: string[];
  date?: string;
  publisher?: string;
  url?: string;
  doi?: string;
  version?: string;
  // BibTeX key stem: record id or page slug
  key: string;
  // APA/Harvard bracket describing what's being cited
  genre?: string;
}

const VIA = `Accessed through the ${SITE_PUBLISHER_NAME}`;

const authorList = (c: Citable) =>
  (c.authors.length > 0 ? c.authors : [SITE_PUBLISHER_NAME]).join(", ");

// A DOI is the preferred identifier; the record's own url is the fallback
const linkOf = (c: Citable) => (c.doi ? `https://doi.org/${c.doi}` : c.url);

// Every style drops the publisher when it's also the author — which is the
// case for anything the hub publishes itself
const publisherOf = (c: Citable) =>
  c.publisher === authorList(c) ? undefined : c.publisher;

const join = (parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" ");

// A trailing URL takes no terminal period (APA); it needs one only when the
// "accessed through" clause follows it
const linkPart = (c: Citable, via?: string) => {
  const link = linkOf(c);
  return link && (via ? `${link}.` : link);
};

// viaUrl appends an "accessed through" clause pointing at the hub page. Pass it
// for things the hub redistributes (datasets); omit it where the hub is the
// publisher (tutorials, wikis) or where only the original citation belongs
// (JSON-LD).
export function citationText(c?: Citable, viaUrl?: string) {
  if (!c) return undefined;
  const via = viaUrl ? `${VIA}, ${viaUrl}.` : undefined;
  return join([
    authorList(c),
    c.date && `(${c.date})`,
    `${c.title}.`,
    // The version pins the citation: the current release's Hub URL rolls
    // forward to newer releases, so the text must record what was used
    c.version && `Version ${c.version}.`,
    publisherOf(c) && `${publisherOf(c)}.`,
    linkPart(c, via),
    via,
  ]);
}

// One text citation per style — the same fields shuffled per convention.
// citationText (above) stays the generic form used in JSON-LD.
export function citationFormats(c?: Citable, viaUrl?: string) {
  if (!c) return [];
  const authors = authorList(c);
  const year = (c.date ?? "").slice(0, 4);
  const link = linkOf(c);
  const via = viaUrl ? `${VIA}, ${viaUrl}.` : undefined;
  const genre = c.genre ?? "Data set";
  return [
    {
      id: "apa",
      label: "APA",
      text: join([
        authors,
        year && `(${year}).`,
        `${c.title}`,
        c.version ? `(Version ${c.version}) [${genre}].` : `[${genre}].`,
        publisherOf(c) && `${publisherOf(c)}.`,
        linkPart(c, via),
        via,
      ]),
    },
    {
      id: "harvard",
      label: "Harvard",
      text: join([
        authors,
        year && `(${year})`,
        `${c.title} [${genre}].`,
        c.version && `Version ${c.version}.`,
        publisherOf(c) && `${publisherOf(c)}.`,
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
        c.version && `Version ${c.version}.`,
        publisherOf(c) && `${publisherOf(c)}.`,
        link && `${link}.`,
        via,
      ]),
    },
  ];
}

export function bibtex(c?: Citable, viaUrl?: string) {
  if (!c) return undefined;
  // Keys allow only word characters; page slugs can be nested paths
  const key = `${c.key.replace(/\W+/g, "_")}_${(c.date ?? "").slice(0, 4)}`;
  // Corporate authors need the inner braces or BibTeX reads the last word
  // as a surname ("Hub, C. C. A. D.")
  const author =
    c.authors.length > 0 ? c.authors.join(" and ") : `{${SITE_PUBLISHER_NAME}}`;
  const lines = [
    `  title     = {${c.title}}`,
    `  author    = {${author}}`,
    c.date && `  year      = {${c.date.slice(0, 4)}}`,
    c.version && `  version   = {${c.version}}`,
    publisherOf(c) && `  publisher = {${publisherOf(c)}}`,
    c.doi ? `  doi       = {${c.doi}}` : c.url && `  url       = {${c.url}}`,
    viaUrl && `  note      = {${VIA}, ${viaUrl}}`,
  ].filter(Boolean);
  return `@misc{${key},\n${lines.join(",\n")}\n}`;
}
