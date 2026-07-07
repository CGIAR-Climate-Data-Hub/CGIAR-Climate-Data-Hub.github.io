import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Markdown/MDX collections. glob() derives each entry's id from its filename.
const tutorials = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/tutorials" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const wikis = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/wikis" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

// CDH metadata records as YAML. glob() loads each file as one entry.
const catalog = defineCollection({
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/content/catalog" }),
  schema: z
    .object({
      id: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { tutorials, wikis, catalog };
