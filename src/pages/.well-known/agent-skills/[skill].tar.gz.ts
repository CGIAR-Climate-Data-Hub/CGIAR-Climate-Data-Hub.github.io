import { getCollection } from "astro:content";
import type { APIRoute, GetStaticPaths } from "astro";

export const getStaticPaths: GetStaticPaths = async () =>
  (await getCollection("skills"))
    .filter((s) => s.data.artifact.type === "archive")
    .map((s) => ({
      params: { skill: s.id },
      props: { base64: s.data.artifact.base64 },
    }));

export const GET: APIRoute<{ base64: string }> = ({ props }) =>
  new Response(Buffer.from(props.base64, "base64"), {
    headers: { "Content-Type": "application/gzip" },
  });
