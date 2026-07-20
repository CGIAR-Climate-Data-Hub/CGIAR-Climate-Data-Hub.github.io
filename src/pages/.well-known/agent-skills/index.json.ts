// Agent Skills discovery index (cloudflare/agent-skills-discovery-rfc v0.2.0).
// Digests are hashed from the same bytes the SKILL.md route serves, so they
// can never drift from the artifacts.

import { getCollection } from "astro:content";
import { createHash } from "node:crypto";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const skills = await getCollection("skills");

  const doc = {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: skills.map((s) => ({
      name: s.data.name,
      type: "skill-md",
      description: s.data.description,
      url: `/.well-known/agent-skills/${s.id}/SKILL.md`,
      digest: `sha256:${createHash("sha256")
        .update(s.body ?? "")
        .digest("hex")}`,
    })),
  };

  return new Response(JSON.stringify(doc, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};
