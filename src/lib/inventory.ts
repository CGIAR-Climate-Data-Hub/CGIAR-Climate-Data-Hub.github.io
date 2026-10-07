// The first rows of a cdh-inventory CSV, read at build time. Only the first
// 4 KB are fetched (an HTTP range request), so a page can show real files
// without downloading the whole list. Any failure means no preview.

const BYTES = 4096;

export interface Preview {
  header: string[];
  rows: string[][];
}

// One CSV line into cells; quoted cells may hold commas and "" quotes
const cells = (line: string) =>
  [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)]
    .slice(0, -1)
    .map(([, c]) =>
      c.startsWith('"') ? c.slice(1, -1).replaceAll('""', '"') : c,
    );

export async function inventoryPreview(
  url: string,
  rows = 5,
): Promise<Preview | undefined> {
  try {
    const res = await fetch(url, {
      // A range of compressed bytes can't be unpacked on its own
      headers: { "Accept-Encoding": "identity", Range: `bytes=0-${BYTES - 1}` },
      signal: AbortSignal.timeout(5000),
    });
    // Only an honoured range: a server that ignores it would send the whole list
    if (res.status !== 206) return undefined;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const lines = new TextDecoder().decode(bytes).split(/\r?\n/);
    // The last line of a cut-off read is partial
    if (bytes.length >= BYTES) lines.pop();
    const [header, ...body] = lines.filter(Boolean).map(cells);
    if (!header?.includes("href")) return undefined;
    return { header, rows: body.slice(0, rows) };
  } catch {
    return undefined;
  }
}
