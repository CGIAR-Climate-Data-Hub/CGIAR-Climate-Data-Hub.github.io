// Serve the exact bytes hashed by the discovery index.

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
