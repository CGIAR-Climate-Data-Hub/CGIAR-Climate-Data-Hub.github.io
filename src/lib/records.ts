// Catalog records live in the cdh-catalog repo, fetched at build time and
// validated by the catalog schema; that repo pings this repo's deploy
// workflow on merge. Shell-env overrides (RECORDS_DIR, RECORDS_REF,
// RECORDS_REPO — see README) redirect a session; on fetch failure the
// previously loaded records are kept, so offline dev keeps working.
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import type { Loader } from "astro/loaders";
import { parse } from "yaml";

interface RecordsSource {
  repo: string;
  dir: string;
}

export interface SourceFile {
  path: string;
  bytes: Uint8Array;
  mode: number;
}

export async function fromLocal(dir: string, match = /./) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return Promise.all(
    entries
      .filter((e) => e.isFile())
      .map((e) =>
        relative(dir, join(e.parentPath, e.name)).split(sep).join("/"),
      )
      .filter((f) => match.test(f))
      .map(async (f): Promise<SourceFile> => {
        const full = join(dir, f);
        return {
          path: f,
          bytes: await readFile(full),
          mode: (await stat(full)).mode & 0o7777,
        };
      }),
  );
}

// Bounded-concurrency map — hundreds of truly parallel GETs trip CI sockets
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
) {
  const results: R[] = Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

export async function fromGitHub(
  { repo, dir }: RecordsSource,
  ref: string,
  match = /./,
) {
  const headers: Record<string, string> = process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {};
  const res = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${ref}?recursive=1`,
    { headers },
  );
  if (!res.ok) throw new Error(`tree listing failed: ${res.status}`);
  const tree = (await res.json()) as {
    sha: string;
    truncated: boolean;
    tree: { path: string; type: string; mode: string }[];
  };
  if (tree.truncated)
    throw new Error(`tree listing for ${repo} was truncated by GitHub`);
  const blobs = tree.tree.filter(
    (t) =>
      t.type === "blob" && t.path.startsWith(`${dir}/`) && match.test(t.path),
  );
  return mapLimit(blobs, 12, async (t): Promise<SourceFile> => {
    const raw = await fetch(
      `https://raw.githubusercontent.com/${repo}/${tree.sha}/${t.path}`,
      { headers },
    );
    if (!raw.ok) throw new Error(`${t.path}: ${raw.status}`);
    return {
      path: t.path.slice(dir.length + 1),
      bytes: new Uint8Array(await raw.arrayBuffer()),
      mode: Number.parseInt(t.mode, 8),
    };
  });
}

export function records(source: RecordsSource): Loader {
  return {
    name: "records",
    async load({ store, parseData, logger }) {
      let files: SourceFile[];
      try {
        files = process.env.RECORDS_DIR
          ? await fromLocal(process.env.RECORDS_DIR, /\.ya?ml$/)
          : await fromGitHub(
              { ...source, repo: process.env.RECORDS_REPO ?? source.repo },
              process.env.RECORDS_REF ?? "main",
              /\.ya?ml$/,
            );
      } catch (err) {
        // With REQUIRE_RECORDS set (deploy workflow), an unavailable catalog
        // fails the build instead of deploying without records
        if (process.env.REQUIRE_RECORDS) throw err;
        logger.warn(
          `records fetch failed (${err}) — keeping previously loaded records`,
        );
        return;
      }
      if (files.length === 0 && process.env.REQUIRE_RECORDS)
        throw new Error("REQUIRE_RECORDS is set but zero records were loaded");
      store.clear();
      const decoder = new TextDecoder();
      for (const f of files) {
        const id = f.path.replace(/\.ya?ml$/, "");
        const data = await parseData({
          id,
          data: parse(decoder.decode(f.bytes)),
        });
        // filePath is repo-relative, for "view source" links on record pages
        store.set({ id, data, filePath: `${source.dir}/${f.path}` });
      }
      logger.info(`loaded ${files.length} records`);
    },
  };
}
