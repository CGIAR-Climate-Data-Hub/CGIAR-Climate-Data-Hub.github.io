import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { WIKI_SECTIONS } from "./lib/collections";

const tutorials = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/tutorials" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    topic: z.string(),
    time: z.string(),
    format: z.string().default("Guide"),
    // "You'll be able to" bullets shown on tutorial cards
    outcomes: z.array(z.string()).default([]),
    updated: z.coerce.date(),
  }),
});

const wikis = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/wikis" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.enum(WIKI_SECTIONS),
    updated: z.coerce.date(),
    // Sidebar position within a section; unordered entries sort alphabetically after
    order: z.number().optional(),
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
});

const citation = z.object({
  title: z.string(),
  authors: z.array(z.string()).default([]),
  date: z.string().optional(),
  publisher: z.string().optional(),
  url: z.string().optional(),
});

const location = z.object({ url: z.string(), title: z.string().optional() });

const asset = z.object({
  name: z.string(),
  description: z.string().optional(),
  locations: z.array(location),
  href_template: z.string().optional(),
  media_type: z.string().optional(),
  file_size: z.string().optional(),
  nodata: z.union([z.string(), z.number()]).optional(),
  roles: z.array(z.string()).default([]),
});

const catalog = defineCollection({
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/content/catalog" }),
  schema: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      version: z.string().optional(),
      license: z.string(),
      resource_type: z.string(),
      doi: z.string().optional(),
      note: z.string().optional(),
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
      created: z.string().optional(),
      updated: z.string().optional(),
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
      temporal: z
        .object({
          start_date: z.string(),
          end_date: z.string().optional(),
          resolution: z
            .object({
              unit: z.string().optional(),
              step: z.string().optional(),
              note: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
      dimensions: z
        .array(
          z.object({
            name: z.string(),
            type: z.string().optional(),
            description: z.string().optional(),
            values: z.array(z.string()).default([]),
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
          }),
        )
        .default([]),
      cdh: z
        .object({
          domain: z.array(z.string()).default([]),
          use_cases: z.array(z.string()).default([]),
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
            derived_from: z.array(location).default([]),
          }),
        )
        .default([]),
      data: z.array(asset).default([]),
      additional_assets: z.array(asset).default([]),
      additional_links: z
        .array(
          z.object({
            name: z.string().optional(),
            rel: z.string().optional(),
            url: z.string(),
            description: z.string().optional(),
          }),
        )
        .default([]),
    })
    .loose(),
});

export const collections = {
  tutorials,
  wikis,
  useCases,
  contributionGuides,
  catalog,
  faq,
  pages,
};
