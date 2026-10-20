import { defineConfig } from "astro/config";

// Two deployments, one build:
//   GitHub Pages (default) — project site at https://gjuoun.github.io/bigface-theme/
//   Cloudflare Pages       — root site at https://bigface.qqntt.com/
// The Cloudflare build sets SITE_BASE=/ SITE_ORIGIN=https://bigface.qqntt.com, because a root
// domain serves from "/" while a project site serves from "/bigface-theme".
const base = process.env.SITE_BASE ?? "/bigface-theme";
const site = process.env.SITE_ORIGIN ?? "https://gjuoun.github.io";

export default defineConfig({
  site,
  base,
  trailingSlash: "always",
  build: { format: "directory" },
});
