// Agent skills live in the skills repo (one folder per skill, Claude-style
// SKILL.md), fetched at build time like the catalog. Shell-env overrides:
// SKILLS_DIR local checkout (e.g. examples/skills), SKILLS_REF branch,
// SKILLS_REPO fork. On fetch failure the previously loaded skills are kept.
import type { Loader } from "astro/loaders";
import { parse } from "yaml";
import { fromGitHub, fromLocal } from "@/lib/records";

interface SkillsSource {
  repo: string;
  dir: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export function skills(source: SkillsSource): Loader {
  return {
    name: "skills",
    async load({ store, parseData, logger }) {
      let files: { path: string; body: string }[];
      try {
        files = process.env.SKILLS_DIR
          ? await fromLocal(process.env.SKILLS_DIR, /(^|\/)SKILL\.md$/)
          : await fromGitHub(
              { ...source, repo: process.env.SKILLS_REPO ?? source.repo },
              process.env.SKILLS_REF ?? "main",
              /(^|\/)SKILL\.md$/,
            );
      } catch (err) {
        logger.warn(
          `skills fetch failed (${err}) — keeping previously loaded skills`,
        );
        return;
      }
      store.clear();
      for (const f of files) {
        const id = f.path.replace(/\/?SKILL\.md$/, "");
        const raw = f.body.match(FRONTMATTER)?.[1];
        if (!id || !raw) {
          logger.warn(`skipping ${f.path}: no folder name or frontmatter`);
          continue;
        }
        const data = await parseData({ id, data: parse(raw) });
        // Discovery serves and hashes the original file.
        store.set({
          id,
          data,
          body: f.body,
          filePath: `${source.dir}/${f.path}`,
        });
      }
      logger.info(`loaded ${files.length} skills`);
    },
  };
}
