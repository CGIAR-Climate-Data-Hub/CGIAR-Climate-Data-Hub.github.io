// Agent Skills discovery index (draft v0.2.0).

import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const skills = await getCollection("skills");

  const doc = {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: skills.map((s) => ({
      name: s.data.name,
      type: s.data.artifact.type,
      description: s.data.description,
      url:
        s.data.artifact.type === "skill-md"
          ? `/.well-known/agent-skills/${s.id}/SKILL.md`
          : `/.well-known/agent-skills/${s.id}.tar.gz`,
      digest: s.data.artifact.digest,
    })),
  };

  return new Response(JSON.stringify(doc, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};
