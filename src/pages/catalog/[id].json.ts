// Raw record endpoint: /catalog/<id>.json — the full CDH record as published.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export async function getStaticPaths() {
  const entries = await getCollection("catalog");
  return entries.map((entry) => ({
    params: { id: entry.data.id },
    props: { record: entry.data },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.record, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
