// Shared Response wrapper for markdown-serving endpoints.
export const markdownResponse = (md: string) =>
  new Response(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
