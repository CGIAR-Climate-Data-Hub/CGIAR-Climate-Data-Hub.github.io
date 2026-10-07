// Raw record endpoint: /catalog/<id>.json — the record as authored, as JSON.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { parse } from "yaml";
import { recordSlug } from "@/lib/catalog";

export async function getStaticPaths() {
  const entries = await getCollection("catalog");
  return entries.map((entry) => ({
    params: { id: recordSlug(entry.data) },
    props: { body: entry.body ?? "" },
  }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(parse(props.body), null, 2), {
    headers: { "Content-Type": "application/json" },
  });
