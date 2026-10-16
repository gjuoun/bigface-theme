import { type ColorName, color, type Palette, syntax } from "../palette.ts";
import type { Target } from "./types.ts";

export const obsidian: Target = {
  id: "obsidian",
  name: "Obsidian",
  files(p: Palette) {
    const c = (n: ColorName) => color(p, n);
    const s = (r: Parameters<typeof syntax>[1]) => syntax(p, r);
    const vars: [string, string][] = [
      ["--color-red", c("pink")],
      ["--color-orange", c("burntOrange")],
      ["--color-yellow", c("yellow")],
      ["--color-green", c("green")],
      ["--color-cyan", c("cyan")],
      ["--color-blue", c("blue")],
      ["--color-purple", c("purple")],
      ["--color-pink", c("pink")],
      ["--background-primary", c("bg")],
      ["--background-primary-alt", c("bgPanel")],
      ["--background-secondary", c("bgDeep")],
      ["--background-secondary-alt", c("bgDeep")],
      ["--background-modifier-hover", c("cursorLine")],
      ["--background-modifier-border", c("borderMuted")],
      ["--background-modifier-border-hover", c("border")],
      ["--background-modifier-border-focus", c("blue")],
      ["--background-modifier-form-field", c("bgDeep")],
      ["--text-normal", c("fg")],
      ["--text-muted", c("fgMuted")],
      ["--text-faint", c("fgDim")],
      ["--text-accent", c("blue")],
      ["--text-accent-hover", c("lightBlue")],
      ["--text-on-accent", c("bg")],
      ["--text-success", c("limeGreen")],
      ["--text-warning", c("orange")],
      ["--text-error", c("pink")],
      ["--text-selection", `${c("selection")}99`],
      ["--text-highlight-bg", `${c("searchBg")}66`],
      ["--caret-color", c("caret")],
      ["--interactive-normal", c("bgPanel")],
      ["--interactive-hover", c("cursorLine")],
      ["--interactive-accent", c("blue")],
      ["--interactive-accent-hover", c("lightBlue")],
      ["--code-background", c("bgDeep")],
      ["--code-normal", c("fg")],
      ["--code-comment", s("comment")],
      ["--code-function", s("function")],
      ["--code-important", c("burntOrange")],
      ["--code-keyword", s("keyword")],
      ["--code-operator", s("operator")],
      ["--code-property", s("variable")],
      ["--code-punctuation", s("punctuation")],
      ["--code-string", s("string")],
      ["--code-tag", s("tag")],
      ["--code-value", s("number")],
    ];
    const css = [
      "/* Bigface — https://github.com/gjuoun/bigface-theme */",
      ".theme-dark {",
      ...vars.map(([k, v]) => `  ${k}: ${v};`),
      "}",
      "",
    ];
    const manifest = {
      name: "Bigface",
      version: "0.1.0",
      minAppVersion: "1.5.0",
      author: "Jun Guo",
      authorUrl: "https://github.com/gjuoun",
    };
    return {
      "Bigface/manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
      "Bigface/theme.css": css.join("\n"),
    };
  },
};
