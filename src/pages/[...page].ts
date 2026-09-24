// Markdown twins live at <page URL>/index.md. MDX and notebooks are excluded
// because their source bodies can contain JSX, imports, or base64 figures.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { type CatalogRecord, currentReleases, datasetMd } from "@/lib/catalog";
import { citationText } from "@/lib/citation";
import { allTutorials, pageCitable } from "@/lib/collections";
import { markdownResponse } from "@/lib/markdown";
import { SITE_URL } from "@/site.config";

type Props = { md: string } | { dataset: CatalogRecord };

export async function getStaticPaths() {
  const cited = [
    ...(await getCollection("wikis")).map((e) => ({ e, base: "wikis" })),
    ...(await allTutorials()).map((e) => ({ e, base: "tutorials" })),
  ].map(({ e, base }) => ({
    e,
    base,
    cite: `Cite: ${citationText(pageCitable(e, `${SITE_URL}/${base}/${e.id}/`))}`,
  }));

  const stories = (await getCollection("useCases")).map((e) => ({
    e,
    base: "in-use",
    cite: undefined,
  }));

  const docs = [...cited, ...stories]
    .filter(({ e }) => e.filePath?.endsWith(".md") && e.body)
    .map(({ e, base, cite }) => ({
      params: { page: `${base}/${e.id}/index.md` },
      props: {
        md: [`# ${e.data.title}`, e.body, cite].filter(Boolean).join("\n\n"),
      },
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
      : `# ${props.dataset.title}\n\n${datasetMd(props.dataset, site, 2)}`,
  );
