export const markdownResponse = (md: string | Uint8Array) =>
  new Response(md as BodyInit, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
