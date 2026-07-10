// Catalog records live in the cdh-catalog repo and are fetched at build
// time (one tree-listing API call + parallel raw fetches), validated by the
// catalog schema. The records repo pings this repo's deploy workflow via
// repository_dispatch on merge.
//
// Overrides:
//   RECORDS_DIR=../cdh-catalog/records  read a local checkout (offline dev,
//                                       previewing unmerged records)
//   RECORDS_REF=some-branch             fetch a branch other than main
//   RECORDS_REPO=you/your-fork           fetch from a different repo
//   GITHUB_TOKEN                        raises the API rate limit (set
//                                       automatically in Actions)
//
// On fetch failure, previously loaded records are kept (offline dev).
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Loader } from "astro/loaders";
import { parse } from "yaml";

interface RecordsSource {
  repo: string;
  dir: string;
}

async function fromLocal(dir: string) {
  const files = await readdir(dir, { recursive: true });
  return Promise.all(
    files
      .filter((f) => /\.ya?ml$/.test(f))
      .map(async (f) => ({
        path: f,
        body: await readFile(join(dir, f), "utf8"),
      })),
  );
}

async function fromGitHub({ repo, dir }: RecordsSource, ref: string) {
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
    .filter((p) => /\.ya?ml$/.test(p));
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
          ? await fromLocal(process.env.RECORDS_DIR)
          : await fromGitHub(
              { ...source, repo: process.env.RECORDS_REPO ?? source.repo },
              process.env.RECORDS_REF ?? "main",
            );
      } catch (err) {
        logger.warn(
          `records fetch failed (${err}) — keeping previously loaded records`,
        );
        return;
      }
      store.clear();
      for (const f of files) {
        const id = f.path.replace(/\.ya?ml$/, "");
        const data = await parseData({ id, data: parse(f.body) });
        store.set({ id, data });
      }
      logger.info(`loaded ${files.length} records`);
    },
  };
}
