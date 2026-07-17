// Catalog records live in the cdh-catalog repo, fetched at build time and
// validated by the catalog schema; that repo pings this repo's deploy
// workflow on merge. Shell-env overrides (RECORDS_DIR, RECORDS_REF,
// RECORDS_REPO — see README) redirect a session; on fetch failure the
// previously loaded records are kept, so offline dev keeps working.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Loader } from "astro/loaders";
import { parse } from "yaml";

interface RecordsSource {
  repo: string;
  dir: string;
}

export async function fromLocal(dir: string, match: RegExp) {
  const files = await readdir(dir, { recursive: true });
  return Promise.all(
    files
      .filter((f) => match.test(f))
      .map(async (f) => ({
        path: f,
        body: await readFile(join(dir, f), "utf8"),
      })),
  );
}

export async function fromGitHub(
  { repo, dir }: RecordsSource,
  ref: string,
  match: RegExp,
) {
  const headers: Record<string, string> = process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {};
  const res = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${ref}?recursive=1`,
    { headers },
  );
  if (!res.ok) throw new Error(`tree listing failed: ${res.status}`);
  const tree = (await res.json()) as { tree: { path: string; type: string }[] };
  const paths = tree.tree
    .filter((t) => t.type === "blob" && t.path.startsWith(`${dir}/`))
    .map((t) => t.path)
    .filter((p) => match.test(p));
  return Promise.all(
    paths.map(async (p) => {
      const raw = await fetch(
        `https://raw.githubusercontent.com/${repo}/${ref}/${p}`,
      );
      if (!raw.ok) throw new Error(`${p}: ${raw.status}`);
      return { path: p.slice(dir.length + 1), body: await raw.text() };
    }),
  );
}

export function records(source: RecordsSource): Loader {
  return {
    name: "records",
    async load({ store, parseData, logger }) {
      let files: { path: string; body: string }[];
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
      for (const f of files) {
        const id = f.path.replace(/\.ya?ml$/, "");
        const data = await parseData({ id, data: parse(f.body) });
        // filePath is repo-relative, for "view source" links on record pages
        store.set({ id, data, filePath: `${source.dir}/${f.path}` });
      }
      logger.info(`loaded ${files.length} records`);
    },
  };
}
