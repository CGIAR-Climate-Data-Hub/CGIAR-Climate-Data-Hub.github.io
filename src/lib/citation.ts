// Shared citation strings for records and documentation pages.
import { SITE_PUBLISHER_NAME } from "@/site.config";

// Record authors are objects; docs page authors are plain names
export type Author =
  | string
  | { family: string; given?: string }
  | { organization: string };

export const authorName = (a: Author) =>
  typeof a === "string"
    ? a
    : "organization" in a
      ? a.organization
      : [a.given, a.family].filter(Boolean).join(" ");

// "Family, Given" marks the surname; braces keep an organization one name
const bibtexName = (a: Author) =>
  typeof a === "string"
    ? a
    : "organization" in a
      ? `{${a.organization}}`
      : [a.family, a.given].filter(Boolean).join(", ");

export interface Citable {
  title: string;
  // Empty means the hub is the author.
  authors: Author[];
  date?: string;
  publisher?: string;
  url?: string;
  doi?: string;
  version?: string;
  // Record id or page slug
  key: string;
}

const VIA = `Accessed through the ${SITE_PUBLISHER_NAME}`;

const authorList = (c: Citable) =>
  (c.authors.length > 0
    ? c.authors.map(authorName)
    : [SITE_PUBLISHER_NAME]
  ).join(", ");

const linkOf = (c: Citable) => (c.doi ? `https://doi.org/${c.doi}` : c.url);

const publisherOf = (c: Citable) =>
  c.publisher === authorList(c) ? undefined : c.publisher;

// viaUrl points to the hub page for a redistributed dataset.
export function citationText(c: Citable, viaUrl?: string) {
  const via = viaUrl ? `${VIA}, ${viaUrl}.` : undefined;
  const link = linkOf(c);
  const publisher = publisherOf(c);
  return [
    authorList(c),
    c.date && `(${c.date})`,
    `${c.title}.`,
    // The hub URL can point to a newer release, so keep the cited version.
    c.version && `Version ${c.version}.`,
    publisher && `${publisher}.`,
    link && (via ? `${link}.` : link),
    via,
  ]
    .filter(Boolean)
    .join(" ");
}

export function bibtex(c: Citable, viaUrl?: string) {
  const key = `${c.key.replace(/\W+/g, "_")}_${(c.date ?? "").slice(0, 4)}`;
  const publisher = publisherOf(c);
  const author =
    c.authors.length > 0
      ? c.authors.map(bibtexName).join(" and ")
      : `{${SITE_PUBLISHER_NAME}}`;
  const lines = [
    `  title     = {${c.title}}`,
    `  author    = {${author}}`,
    c.date && `  year      = {${c.date.slice(0, 4)}}`,
    c.version && `  version   = {${c.version}}`,
    publisher && `  publisher = {${publisher}}`,
    c.doi ? `  doi       = {${c.doi}}` : c.url && `  url       = {${c.url}}`,
    viaUrl && `  note      = {${VIA}, ${viaUrl}}`,
  ].filter(Boolean);
  return `@misc{${key},\n${lines.join(",\n")}\n}`;
}
