// @ts-check

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
  prefetch: { prefetchAll: true },
  output: "static",
  trailingSlash: "always",

  markdown: {
    // Single theme: the site is light-only, and <Code> components use github-light
    shikiConfig: {
      theme: "github-light",
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
