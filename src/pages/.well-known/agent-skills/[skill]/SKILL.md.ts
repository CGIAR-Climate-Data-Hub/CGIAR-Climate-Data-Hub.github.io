// Verbatim SKILL.md artifacts referenced by the discovery index — served
// from the site so the index digests always match what clients download.

import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import { markdownResponse } from "@/lib/markdown";

export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection("skills")).map((s) => ({
    params: { skill: s.id },
    props: { body: s.body ?? "" },
  }));

export const GET: APIRoute<{ body: string }> = ({ props }) =>
  markdownResponse(props.body);
