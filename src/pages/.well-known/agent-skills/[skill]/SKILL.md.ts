// Serve the exact bytes hashed by the discovery index.

import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";
import { markdownResponse } from "@/lib/markdown";

export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection("skills")).map((s) => ({
    params: { skill: s.id },
    props: { base64: s.data.skillBase64 },
  }));

export const GET: APIRoute<{ base64: string }> = ({ props }) =>
  markdownResponse(Buffer.from(props.base64, "base64"));
