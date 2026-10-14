// Every file a templated asset or file index names, as a downloadable
// cdh-inventory CSV expanded from its href_template at build time.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { inventories, recordSlug } from "@/lib/catalog";

export async function getStaticPaths() {
  const entries = await getCollection("catalog");
  return entries.flatMap((entry) =>
    inventories(entry.data).map(({ name, inventory }) => ({
      params: { id: recordSlug(entry.data), asset: name },
      props: { csv: inventory.csv },
    })),
  );
}

export const GET: APIRoute = ({ props }) =>
  new Response(props.csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8" },
  });
