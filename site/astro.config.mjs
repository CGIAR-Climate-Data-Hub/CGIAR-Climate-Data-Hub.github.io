// @ts-check

import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

import pagefind from "astro-pagefind";

// Different deploy opts depending on the env (gh pages vs cloudflare)
const base = process.env.BASE_PATH ?? "/";
const site = process.env.SITE_URL;

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
      cssVariable: "--font-noto-sans",
      provider: fontProviders.fontsource(),
      weights: [300, 400, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
    },
    {
      name: "Noto Serif",
      cssVariable: "--font-noto-serif",
      provider: fontProviders.fontsource(),
      weights: [400, 700],
      styles: ["normal", "italic"],
      subsets: ["latin"],
      fallbacks: ["serif"],
    },
  ],
});
