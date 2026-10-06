// Every file a templated asset names, as a downloadable cdh-inventory CSV,
// expanded from its href_template at build time.

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { recordSlug, templateInventory } from "@/lib/catalog";

export async function getStaticPaths() {
  const entries = await getCollection("catalog");
  return entries.flatMap((entry) =>
    entry.data.data.flatMap((asset) => {
      const inventory =
        asset.href_template
        && templateInventory(entry.data, asset.href_template);
      if (!inventory) return [];
      return [
        {
          params: { id: recordSlug(entry.data), asset: asset.name },
          props: { csv: inventory.csv },
        },
      ];
    }),
  );
}

export const GET: APIRoute = ({ props }) =>
  new Response(props.csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8" },
  });
