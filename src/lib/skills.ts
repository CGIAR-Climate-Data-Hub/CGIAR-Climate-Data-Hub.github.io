// Agent skills live in the skills repo (one folder per skill, Claude-style
// SKILL.md), fetched at build time like the catalog. Shell-env overrides:
// SKILLS_DIR local checkout (e.g. examples/skills), SKILLS_REF branch,
// SKILLS_REPO fork. On fetch failure the previously loaded skills are kept.
import type { Loader } from "astro/loaders";
import { parse } from "yaml";
import { fromGitHub, fromLocal, type SourceFile } from "@/lib/records";
import { createSkillArtifact } from "@/lib/tar";

interface SkillsSource {
  repo: string;
  dir: string;
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---/;

export function skills(source: SkillsSource): Loader {
  return {
    name: "skills",
    async load({ store, parseData, logger }) {
      let files: SourceFile[];
      try {
        files = process.env.SKILLS_DIR
          ? await fromLocal(process.env.SKILLS_DIR)
          : await fromGitHub(
              { ...source, repo: process.env.SKILLS_REPO ?? source.repo },
              process.env.SKILLS_REF ?? "main",
            );
      } catch (err) {
        logger.warn(
          `skills fetch failed (${err}) — keeping previously loaded skills`,
        );
        return;
      }
      const folders = new Map<string, SourceFile[]>();
      for (const f of files) {
        const [id, ...rest] = f.path.split("/");
        if (!id || rest.length === 0) continue; // stray root files
        const list = folders.get(id) ?? [];
        list.push({ ...f, path: rest.join("/") });
        folders.set(id, list);
      }
      store.clear();
      const decoder = new TextDecoder();
      let loaded = 0;
      for (const [id, folder] of folders) {
        const skill = folder.find((f) => f.path === "SKILL.md");
        const body = skill && decoder.decode(skill.bytes);
        const raw = body?.match(FRONTMATTER)?.[1];
        if (!body || !raw) {
          logger.warn(`skipping ${id}: no SKILL.md frontmatter`);
          continue;
        }
        const data = await parseData({
          id,
          data: {
            ...parse(raw),
            skillBase64: Buffer.from(skill.bytes).toString("base64"),
            artifact: await createSkillArtifact(folder),
          },
        });
        store.set({
          id,
          data,
          body,
          filePath: `${source.dir}/${id}/SKILL.md`,
        });
        loaded++;
      }
      logger.info(`loaded ${loaded} skills`);
    },
  };
}
