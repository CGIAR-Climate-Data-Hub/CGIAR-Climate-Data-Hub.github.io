// @ts-check

import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

import pagefind from "astro-pagefind";

// Canonical production domain. Served at the root as the org's GitHub Pages site, so there
// is no `base` (Astro defaults to "/"). To switch to a custom domain later: change this one
// value + add public/CNAME — base stays "/" the whole time.
const site = "https://cgiar-climate-data-hub.github.io";

// https://astro.build/config
export default defineConfig({
  site,
  integrations: [mdx(), sitemap(), pagefind()],
  prefetch: true,
  output: "static",
  trailingSlash: "never",

  markdown: {
    processor: satteri(),
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
      weights: [300, 400, 500, 600, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
    },
    {
      // Serif ledes use 300 for the editorial light feel; headings 500-600
      name: "Noto Serif",
      cssVariable: "--font-serif",
      provider: fontProviders.fontsource(),
      weights: [300, 400, 500, 600, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["serif"],
    },
  ],
});
