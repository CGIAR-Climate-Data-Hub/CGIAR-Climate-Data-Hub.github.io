# Example skills

Dev fixtures for the `skills` collection — enough sample skills to light up
the `/ai/` page without fetching the real skills repo.

One folder per skill, holding a Claude-style `SKILL.md` with `name` and
`description` frontmatter (this README is ignored by the loader). They are
used **only** when `SKILLS_DIR` points here (`bun run dev:example` does) —
production builds fetch the skills repo's `.agents/skills/` via
`src/lib/skills.ts`, with `SKILLS_REPO`/`SKILLS_REF` shell-env overrides
mirroring the catalog's `RECORDS_*` ones.
