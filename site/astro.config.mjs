// @ts-check

import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

import pagefind from "astro-pagefind";

// Deploy target sets the subpath (GH Pages serves under /climate-data-hub).
const base = process.env.BASE_PATH ?? "/";

// Canonical production domain. Read from the deploy env, with a fixed fallback so canonical
// URLs + the sitemap still resolve in local dev. To switch domains later: change SITE_URL in
// the deploy workflow (and, for a custom domain, drop `base` + add public/CNAME).
const site = process.env.SITE_URL ?? "https://cgiar-climate-data-hub.github.io";

// https://astro.build/config
export default defineConfig({
  site,
  base,
  integrations: [mdx(), sitemap(), pagefind()],
  prefetch: true,
  output: "static",
  trailingSlash: "never",

  markdown: {
    processor: satteri({
      features: { directive: true },
    }),
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },

  fonts: [
    {
      name: "Noto Sans",
      cssVariable: "--font-sans",
      provider: fontProviders.fontsource(),
      weights: [300, 400, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
    },
    {
      name: "Noto Serif",
      cssVariable: "--font-serif",
      provider: fontProviders.fontsource(),
      weights: [400, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["serif"],
    },
  ],
});