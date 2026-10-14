// Markdown twins live at <page URL>/index.md. MDX and notebooks are excluded
// because their source bodies can contain JSX, imports, or base64 figures.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { parse, stringify } from "yaml";
import { type CatalogRecord, currentReleases, datasetMd } from "@/lib/catalog";
import { allTutorials, pageMd, publishedWikis } from "@/lib/collections";
import { markdownResponse } from "@/lib/markdown";
import { SITE_URL } from "@/site.config";

type Props = { md: string } | { dataset: CatalogRecord; yaml: string };

export async function getStaticPaths() {
  const docs = [
    ...(await publishedWikis()).map((e) => ({ e, base: "wikis" })),
    ...(await allTutorials()).map((e) => ({ e, base: "tutorials" })),
  ]
    .filter(({ e }) => e.filePath?.endsWith(".md") && e.body)
    .map(({ e, base }) => ({
      params: { page: `${base}/${e.id}/index.md` },
      props: { md: pageMd(e, `${SITE_URL}/${base}/${e.id}/`) },
    }));

  const datasets = currentReleases(await getCollection("catalog")).map((e) => ({
    params: { page: `catalog/${e.data.id}/index.md` },
    // Re-serialize so anchors/aliases are resolved, as the JSON endpoint does
    props: {
      dataset: e.data,
      yaml: stringify(parse(e.body ?? "", { merge: true }), {
        aliasDuplicateObjects: false,
      }),
    },
  }));

  return [...docs, ...datasets];
}

export const GET: APIRoute<Props> = ({ props, site }) =>
  markdownResponse(
    "md" in props
      ? props.md
      : `# ${props.dataset.title}\n\n${datasetMd(props.dataset, site, props.yaml)}`,
  );
