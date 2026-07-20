// Markdown twins: content pages are also served as <page URL> + index.md —
// the append-index.md pattern agents use to skip HTML parsing. Only
// .md-sourced entries qualify: MDX and notebook bodies would leak
// imports/JSX/base64 figures, so those pages have no twin (llms-full.txt
// and, post-Cloudflare, edge HTML→markdown conversion cover them).
// Dataset twins are generated from record data in GET, where `site` exists.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { type CatalogRecord, currentReleases, datasetMd } from "@/lib/catalog";
import { allTutorials } from "@/lib/collections";
import { markdownResponse } from "@/lib/markdown";

type Props = { md: string } | { dataset: CatalogRecord };

export async function getStaticPaths() {
  const docs = [
    ...(await getCollection("wikis")).map((e) => ({ e, base: "wikis" })),
    ...(await allTutorials()).map((e) => ({ e, base: "tutorials" })),
    ...(await getCollection("useCases")).map((e) => ({ e, base: "in-use" })),
  ]
    .filter(({ e }) => e.filePath?.endsWith(".md") && e.body)
    .map(({ e, base }) => ({
      params: { page: `${base}/${e.id}/index.md` },
      props: { md: `# ${e.data.title}\n\n${e.body}` },
    }));

  const datasets = currentReleases(await getCollection("catalog")).map((e) => ({
    params: { page: `catalog/${e.data.id}/index.md` },
    props: { dataset: e.data },
  }));

  return [...docs, ...datasets];
}

export const GET: APIRoute<Props> = ({ props, site }) =>
  markdownResponse(
    "md" in props
      ? props.md
      : `# ${props.dataset.title}\n\n${datasetMd(props.dataset, site)}`,
  );
