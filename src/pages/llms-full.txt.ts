// llms-full.txt — the expanded companion to llms.txt: the Hub's docs and
// catalog metadata inlined in one file, for agents that fetch once and
// don't crawl. Notebook tutorials have no markdown body (their rendered
// form embeds base64 figures) — those entries fall back to a link.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { currentReleases, datasetMd } from "@/lib/catalog";
import { allTutorials } from "@/lib/collections";
import { SITE_DESCRIPTION, SITE_NAME } from "@/site.config";

export const GET: APIRoute = async ({ site }) => {
  const abs = (path: string) => new URL(path, site).href;
  const catalog = currentReleases(await getCollection("catalog"));
  const wikis = await getCollection("wikis");
  const tutorials = await allTutorials();
  const faq = (await getCollection("faq")).sort(
    (a, b) => a.data.order - b.data.order,
  );
  const useCases = await getCollection("useCases");

  const datasets = catalog.map(
    (c) => `### ${c.data.title}\n\n${datasetMd(c.data, site)}`,
  );

  const doc = (title: string, url: string, body?: string, desc?: string) =>
    `### ${title}\n\n${abs(url)}\n\n${(body ?? desc ?? "").trim()}`;

  const md = `# ${SITE_NAME} — full documentation

> ${SITE_DESCRIPTION} This is the expanded companion to ${abs("/llms.txt")}: docs and catalog metadata in one file. Each dataset's complete metadata record is at /catalog/<id>.json; cite datasets per the "How to cite" section on their record page.

## Datasets

${datasets.join("\n\n")}

## Documentation

${wikis.map((w) => doc(w.data.title, `/wikis/${w.id}/`, w.body)).join("\n\n")}

## Tutorials

${tutorials.map((t) => doc(t.data.title, `/tutorials/${t.id}/`, t.body, t.data.description)).join("\n\n")}

## FAQ

${faq.map((f) => `### ${f.data.question}\n\n${(f.body ?? "").trim()}`).join("\n\n")}

## Use cases

${useCases.map((u) => doc(u.data.title, `/in-use/${u.id}/`, u.body, u.data.description)).join("\n\n")}
`;

  return new Response(md, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
