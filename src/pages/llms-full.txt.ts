// Expanded llms.txt companion: every doc twin and dataset header in one file.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { currentReleases, datasetMd } from "@/lib/catalog";
import { allTutorials, pageMd, publishedWikis } from "@/lib/collections";
import { SITE_DESCRIPTION, SITE_NAME } from "@/site.config";

export const GET: APIRoute = async ({ site }) => {
  const abs = (path: string) => new URL(path, site).href;
  const catalog = currentReleases(await getCollection("catalog"));
  const wikis = await publishedWikis();
  const tutorials = await allTutorials();
  const faq = (await getCollection("faq")).sort(
    (a, b) => a.data.order - b.data.order,
  );

  // Twins start at h1; shift them under this file's h2 sections.
  const nest = (md: string) =>
    md.replace(/^(#{1,6})(?= )/gm, (h) =>
      "#".repeat(Math.min(h.length + 2, 6)),
    );

  const md = `# ${SITE_NAME} — full documentation

> ${SITE_DESCRIPTION} This is the expanded companion to ${abs("/llms.txt")}: docs and catalog metadata in one file. Each dataset's complete metadata record is at /catalog/<id>.json; cite datasets per the "How to cite" section on their record page.

## Datasets

${catalog.map((c) => `### ${c.data.title}\n\n${datasetMd(c.data, site)}`).join("\n\n")}

## Documentation

${wikis.map((w) => nest(pageMd(w, abs(`/wikis/${w.id}/`)))).join("\n\n")}

## Tutorials

${tutorials.map((t) => nest(pageMd(t, abs(`/tutorials/${t.id}/`)))).join("\n\n")}

## FAQ

${faq.map((f) => `### ${f.data.question}\n\n${(f.body ?? "").trim()}`).join("\n\n")}
`;

  return new Response(md, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
