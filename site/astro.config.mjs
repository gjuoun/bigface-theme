import { defineConfig } from "astro/config";

// GitHub Pages project site: https://gjuoun.github.io/bigface-theme/
export default defineConfig({
  site: "https://gjuoun.github.io",
  base: "/bigface-theme",
  trailingSlash: "always",
  build: { format: "directory" },
});
