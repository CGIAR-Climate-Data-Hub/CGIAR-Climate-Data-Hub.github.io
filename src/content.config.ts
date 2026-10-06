import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { SIZE_UNITS } from "./lib/catalog";
import { WIKI_GROUPS } from "./lib/collections";
import { notebooks } from "./lib/notebooks";
import { records } from "./lib/records";
import { skills as skillsLoader } from "./lib/skills";
import { CATALOG_REPO, SCHEMA_SERIES, SKILLS_REPO } from "./site.config";

// One name or a list; normalised to a list so templates handle one shape
const authors = z
  .union([z.string(), z.array(z.string())])
  .transform((a) => [a].flat())
  .default([]);

const tutorialSchema = z.object({
  title: z.string(),
  description: z.string(),
  author: authors,
  // Who the tutorial is for — the card/facet axis ("is this for me?")
  audience: z.enum(["Anyone", "Python & R", "GIS"]),
  topic: z.string(),
  time: z.string(),
  format: z.string().default("Guide"),
  // "You'll be able to" bullets shown on tutorial cards
  outcomes: z.array(z.string()).default([]),
  // Catalog record ids (data.id) this tutorial works with — cross-linked
  // on both the tutorial and the record pages
  datasets: z.array(z.string()).default([]),
  updated: z.coerce.date(),
});

const tutorials = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/tutorials" }),
  schema: tutorialSchema,
});

// Executed Jupyter notebooks in the same folder; frontmatter lives in the
// notebook's metadata.cdh block (see src/lib/notebooks.ts)
const notebookTutorials = defineCollection({
  loader: notebooks("./src/content/tutorials"),
  schema: tutorialSchema,
});

const wikis = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/wikis" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: authors,
    // Sidebar group
    group: z.enum(WIKI_GROUPS),
    updated: z.coerce.date(),
    // Sidebar position within a group; unordered entries sort alphabetically after
    order: z.number().optional(),
    // Planned but unwritten: listed in the sidebar, no page generated
    soon: z.boolean().default(false),
  }),
});

// One markdown file per question; the body is the answer.
const faq = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/faq" }),
  schema: z.object({
    question: z.string(),
    order: z.number(),
  }),
});

// Editorial singletons (about): structured sections in frontmatter, prose in the body.
const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    lede: z.string(),
    missions: z.array(z.object({ title: z.string(), body: z.string() })),
    principles: z.array(z.object({ title: z.string(), body: z.string() })),
  }),
});

const useCases = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/use-cases" }),
  schema: z.object({
    title: z.string(),
    kind: z.enum(["Impact", "Adoption"]).default("Impact"),
    partner: z.string(),
    sector: z.string(),
    country: z.string(),
    description: z.string(),
    impact: z.array(z.string()).default([]),
    // Catalog record ids (data.id) this story draws on
    datasets: z.array(z.string()).default([]),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
  }),
});

const contributionGuides = defineCollection({
  loader: glob({
    pattern: "**/*.{yaml,yml}",
    base: "./src/content/contribution-guides",
  }),
  schema: z.object({
    order: z.number(),
    label: z.string(),
    icon: z.string(),
    title: z.string(),
    intro: z.string(),
    audience: z.string(),
    time: z.string(),
    steps: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
        code: z.string().optional(),
        // Shiki language for the code snippet; extend as guides need
        lang: z.enum(["sh", "json", "yaml"]).default("sh"),
      }),
    ),
    checklist: z.array(z.string()),
  }),
});

// ---- CDH metadata records (YAML, one per dataset) ----
// Typed for what the site renders; .loose() keeps the rest of the record
// available (the CDH standard's own JSON schema is the source of truth).

const keyword = z.union([
  z.string(),
  z.object({
    term: z.string(),
    scheme: z.string().optional(),
    uri: z.string().optional(),
  }),
]);

const contact = z.object({
  name: z.string().optional(),
  organization: z.string().optional(),
  roles: z.array(z.string()).default([]),
  email: z.string().optional(),
  url: z.string().optional(),
  // Full https://orcid.org/ and https://ror.org/ URLs
  orcid: z.string().optional(),
  ror: z.string().optional(),
});

// A person or an organization, in citation order (CSL-JSON shape)
const author = z.union([
  z.object({ family: z.string(), given: z.string().optional() }),
  z.object({ organization: z.string() }),
]);

const citation = z.object({
  title: z.string().optional(),
  authors: z.array(author).default([]),
  date: z.string().optional(),
  publisher: z.string().optional(),
  url: z.string().optional(),
});

const location = z.object({ url: z.string(), title: z.string().optional() });

const asset = z.object({
  name: z.string(),
  description: z.string().optional(),
  // Omitted when a file_index carries the locations
  locations: z.array(location).default([]),
  href_template: z.string().optional(),
  media_type: z.string().optional(),
  // Whole bytes or "31.1 MB" (powers of 1000); stored as bytes
  file_size: z
    .union([z.number(), z.string()])
    .transform((s) => {
      if (typeof s === "number") return s;
      const [, n, unit] = s.match(/^([\d.]+)\s?(\w+)$/) ?? [];
      return Math.ceil(Number(n) * 1000 ** SIZE_UNITS.indexOf(unit));
    })
    .optional(),
  nodata: z.union([z.string(), z.number()]).optional(),
  // Single-file digest as <algorithm>:<hex>
  checksum: z.string().optional(),
  // Index files that list or open this entry's files as one dataset
  file_index: z
    .array(
      z.object({
        format: z.string(),
        locations: z.array(location),
        title: z.string().optional(),
        // Omitted when the index is a directory (Icechunk, Kerchunk Parquet)
        media_type: z.string().optional(),
      }),
    )
    .default([]),
});

const catalog = defineCollection({
  loader: records({
    repo: CATALOG_REPO,
    dir: "records",
  }),
  schema: z
    .object({
      cdh_schema_version: z
        .string()
        .startsWith(`${SCHEMA_SERIES}.`, `site renders CDH ${SCHEMA_SERIES}.x`),
      id: z.string(),
      title: z.string(),
      description: z.string(),
      version: z.string(),
      // Releases share one id; superseded ones are deprecated, and each
      // names its predecessor's version
      previous_version: z.string().optional(),
      deprecated: z.boolean().default(false),
      // id of the record this one is a child representation of
      parent: z.string().optional(),
      // Cross-dataset family (e.g. MapSPAM), distinct from the version chain
      series: z
        .object({ name: z.string(), url: z.string().optional() })
        .optional(),
      license: z.string(),
      resource_type: z.string(),
      // "public" (the default) is open; restricted/non-public flag the
      // header + Access section
      access: z.string().optional(),
      access_note: z.string().optional(),
      doi: z.string().optional(),
      note: z.string().optional(),
      // Credit line reusers must reproduce (Copernicus, OpenStreetMap…)
      attribution: z.string().optional(),
      keywords: z.array(keyword).default([]),
      contact: z.array(contact).default([]),
      citation: citation.optional(),
      related_publications: z
        .array(
          z.object({
            doi: z.string().optional(),
            citation: citation.optional(),
          }),
        )
        .default([]),
      funding: z
        .array(z.object({ name: z.string(), url: z.string().optional() }))
        .default([]),
      created: z.string(),
      updated: z.string(),
      spatial: z
        .object({
          // Either one bbox or a list of them, per the datacube extension
          bbox: z
            .union([z.array(z.number()), z.array(z.array(z.number()))])
            .optional(),
          geography: z.array(z.string()).default([]),
          crs: z.string().optional(),
          resolution: z
            .array(
              z.object({
                type: z.string().optional(),
                unit: z.string().optional(),
                value: z.number().optional(),
                label: z.string().optional(),
              }),
            )
            .default([]),
        })
        .optional(),
      // Dates are ISO 8601, possibly reduced precision ("2020", "2020-06");
      // a reduced-precision end_date is inclusive (through the period's end).
      temporal: z
        .union([
          // Static reference date — "represents 2020", not "covers 2020"
          z.object({ date: z.string() }),
          // Coverage span; end_date is required but null when ongoing
          z.object({
            start_date: z.string(),
            end_date: z.string().nullable(),
            // How often the resource gains data: daily … annual, irregular
            update_frequency: z.string().optional(),
          }),
        ])
        .optional(),
      dimensions: z
        .array(
          z.object({
            name: z.string(),
            type: z.string().optional(),
            description: z.string().optional(),
            // The standard allows bare numbers (years); the site works in strings
            values: z.array(z.coerce.string()).default([]),
            // [first, last] of a regular temporal axis, in place of values
            extent: z.array(z.string()).optional(),
            // ISO 8601 duration between slices, on temporal axes
            step: z.string().optional(),
          }),
        )
        .default([]),
      variables: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            data_type: z.string().optional(),
            unit: z.string().optional(),
            note: z.string().optional(),
            // Code → label for categorical values
            categories: z
              .array(
                z.object({
                  value: z.coerce.string(),
                  label: z.string(),
                  description: z.string().optional(),
                }),
              )
              .default([]),
          }),
        )
        .default([]),
      cdh: z
        .object({
          domain: z.array(z.string()).default([]),
          usage: z
            .object({
              intended_uses: z.array(z.string()).default([]),
              not_recommended_for: z
                .array(
                  z.object({
                    use: z.string(),
                    reason: z.string().optional(),
                    use_instead: z.string().optional(),
                  }),
                )
                .default([]),
            })
            .prefault({}),
        })
        .optional(),
      // Climate extension: modelling methods behind projection datasets
      climate: z
        .object({
          baseline: z
            .object({
              start_date: z.string(),
              end_date: z.string().optional(),
            })
            .optional(),
          bias_adjustment: z
            .object({
              method: z.string().optional(),
              reference_dataset: z.string().optional(),
            })
            .optional(),
          downscaling: z
            .object({
              method: z.string().optional(),
              resolution: z.string().optional(),
            })
            .optional(),
          mip_era: z.string().optional(),
          models: z.array(z.string()).default([]),
          scenarios: z.array(z.string()).default([]),
        })
        .optional(),
      commodities: z.array(z.string()).default([]),
      processing: z
        .array(
          z.object({
            id: z.string(),
            description: z.string().optional(),
            date: z.string().optional(),
            code: z
              .object({ url: z.string(), version: z.string().optional() })
              .optional(),
            // A Hub record id or a storage url, never both
            derived_from: z
              .array(
                z.object({
                  id: z.string().optional(),
                  url: z.string().optional(),
                  title: z.string().optional(),
                  // The source release used, when the link should not float
                  version: z.string().optional(),
                }),
              )
              .default([]),
          }),
        )
        .default([]),
      data: z.array(asset).default([]),
      additional_assets: z.array(asset).default([]),
      additional_links: z
        .array(
          z.object({
            title: z.string().optional(),
            rel: z.string().optional(),
            url: z.string(),
            description: z.string().optional(),
          }),
        )
        .default([]),
    })
    .loose(),
});

// Agent skills for the /ai/ page: one folder per skill, Claude-style
// SKILL.md with name/description frontmatter, fetched from the skills repo
// (SKILLS_DIR=examples/skills for the dev fixtures — see src/lib/skills.ts)
const skills = defineCollection({
  loader: skillsLoader({ repo: SKILLS_REPO, dir: ".agents/skills" }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    skillBase64: z.string(),
    artifact: z.object({
      type: z.enum(["skill-md", "archive"]),
      digest: z.string(),
      base64: z.string(),
    }),
  }),
});

export const collections = {
  tutorials,
  notebookTutorials,
  wikis,
  useCases,
  contributionGuides,
  catalog,
  faq,
  pages,
  skills,
};
