// RFC 9727 API catalog (linkset, RFC 9264) — points agents at the machine-readable endpoints.

import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const abs = (path: string) => new URL(path, site).href;

  const doc = {
    linkset: [
      {
        anchor: abs("/catalog.json"),
        "service-doc": [{ href: abs("/ai/"), type: "text/html" }],
      },
    ],
  };

  return new Response(JSON.stringify(doc, null, 2), {
    headers: { "Content-Type": "application/linkset+json" },
  });
};
