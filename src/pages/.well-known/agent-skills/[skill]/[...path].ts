// Every file of each skill, loose, so relative links in SKILL.md resolve.
// Bytes are served as-is: they match the discovery index digests.

import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";

export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection("skills")).flatMap((s) =>
    Object.entries(s.data.files).map(([path, base64]) => ({
      params: { skill: s.id, path },
      props: { base64 },
    })),
  );

export const GET: APIRoute<{ base64: string }> = ({ props }) =>
  new Response(Buffer.from(props.base64, "base64"));
