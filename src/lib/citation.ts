// Shared citation strings for records and documentation pages.
import { SITE_PUBLISHER_NAME } from "@/site.config";

export interface Citable {
  title: string;
  // Empty means the hub is the author.
  authors: string[];
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
  (c.authors.length > 0 ? c.authors : [SITE_PUBLISHER_NAME]).join(", ");

const linkOf = (c: Citable) => (c.doi ? `https://doi.org/${c.doi}` : c.url);

const publisherOf = (c: Citable) =>
  c.publisher === authorList(c) ? undefined : c.publisher;

const join = (parts: (string | false | undefined)[]) =>
  parts.filter(Boolean).join(" ");

const linkPart = (c: Citable, via?: string) => {
  const link = linkOf(c);
  return link && (via ? `${link}.` : link);
};

// viaUrl points to the hub page for a redistributed dataset.
export function citationText(c?: Citable, viaUrl?: string) {
  if (!c) return undefined;
  const via = viaUrl ? `${VIA}, ${viaUrl}.` : undefined;
  return join([
    authorList(c),
    c.date && `(${c.date})`,
    `${c.title}.`,
    // The hub URL can point to a newer release, so keep the cited version.
    c.version && `Version ${c.version}.`,
    publisherOf(c) && `${publisherOf(c)}.`,
    linkPart(c, via),
    via,
  ]);
}

export function bibtex(c?: Citable, viaUrl?: string) {
  if (!c) return undefined;
  const key = `${c.key.replace(/\W+/g, "_")}_${(c.date ?? "").slice(0, 4)}`;
  // Braces keep a corporate author together in BibTeX.
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
