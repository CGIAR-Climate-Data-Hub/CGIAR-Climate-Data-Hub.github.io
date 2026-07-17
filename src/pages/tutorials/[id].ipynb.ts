// Raw notebook endpoint: /tutorials/<id>.ipynb — the source notebook for
// download; also the file Colab opens via the GitHub link on tutorial pages.

import { getCollection } from "astro:content";
import { readFile } from "node:fs/promises";
import type { APIRoute } from "astro";

export async function getStaticPaths() {
  return (await getCollection("notebookTutorials")).flatMap((entry) =>
    entry.filePath
      ? [{ params: { id: entry.id }, props: { filePath: entry.filePath } }]
      : [],
  );
}

export const GET: APIRoute = async ({ props }) =>
  new Response(await readFile(props.filePath as string), {
    headers: { "Content-Type": "application/x-ipynb+json" },
  });
