// Raw notebook endpoint: /tutorials/<id>.ipynb — the source notebook for
// download; also the file Colab opens via the GitHub link on tutorial pages.

import { readdir, readFile } from "node:fs/promises";
import type { APIRoute } from "astro";

const DIR = "src/content/tutorials";

export async function getStaticPaths() {
  return (await readdir(DIR))
    .filter((f) => f.endsWith(".ipynb"))
    .map((f) => ({ params: { id: f.replace(/\.ipynb$/, "").toLowerCase() } }));
}

export const GET: APIRoute = async ({ params }) =>
  new Response(await readFile(`${DIR}/${params.id}.ipynb`), {
    headers: { "Content-Type": "application/x-ipynb+json" },
  });
