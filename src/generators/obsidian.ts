import { type ColorName, color, type Palette, syntax } from "../palette.ts";
import type { Target } from "./types.ts";

/** "#rrggbb" -> "r, g, b" (Obsidian's *-rgb variables). */
export function rgbTriplet(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
}

/** "#rrggbb" -> [hue, saturation %, lightness %] for --accent-h/s/l. */
export function hsl(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, Math.round(l * 100)];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(h * 60 + 360) % 360, Math.round(s * 100), Math.round(l * 100)];
}

type Rows = [name: string, value: string][];

export function obsidianVariables(p: Palette): { title: string; rows: Rows }[] {
  const c = (n: ColorName) => color(p, n);
  const s = (r: Parameters<typeof syntax>[1]) => syntax(p, r);
  const a = (n: ColorName, alpha: string) => `${c(n)}${alpha}`;
  const [ah, as, al] = hsl(c("blue"));
  const pink = p.ansi.magenta.hex;
  return [
    {
      title: "Colours (the *-rgb triplets drive callouts, canvas colours and translucent fills)",
      rows: [
        ["--color-red", c("burntOrange")],
        ["--color-red-rgb", rgbTriplet(c("burntOrange"))],
        ["--color-orange", c("burntOrange")],
        ["--color-orange-rgb", rgbTriplet(c("burntOrange"))],
        ["--color-yellow", c("yellow")],
        ["--color-yellow-rgb", rgbTriplet(c("yellow"))],
        ["--color-green", c("green")],
        ["--color-green-rgb", rgbTriplet(c("green"))],
        ["--color-cyan", c("cyan")],
        ["--color-cyan-rgb", rgbTriplet(c("cyan"))],
        ["--color-blue", c("blue")],
        ["--color-blue-rgb", rgbTriplet(c("blue"))],
        ["--color-purple", c("purple")],
        ["--color-purple-rgb", rgbTriplet(c("purple"))],
        ["--color-pink", pink],
        ["--color-pink-rgb", rgbTriplet(pink)],
      ],
    },
    {
      title: "Greys: Obsidian derives most of its UI from this scale (00 darkest -> 100 lightest)",
      rows: [
        ["--color-base-00", c("bg")],
        ["--color-base-05", c("cursorLine")],
        ["--color-base-10", c("borderMuted")],
        ["--color-base-20", c("cursorLine")],
        ["--color-base-25", c("border")],
        ["--color-base-30", c("border")],
        ["--color-base-35", c("selection")],
        ["--color-base-40", c("fgDim")],
        ["--color-base-50", c("comment")],
        ["--color-base-60", c("comment")],
        ["--color-base-70", c("fg")],
        ["--color-base-100", c("caret")],
      ],
    },
    {
      title: "Accent",
      rows: [
        ["--accent-h", String(ah)],
        ["--accent-s", `${as}%`],
        ["--accent-l", `${al}%`],
        ["--color-accent", c("blue")],
        ["--color-accent-1", c("blue")],
        ["--color-accent-2", c("lightBlue")],
        ["--interactive-accent", c("blue")],
        ["--interactive-accent-hover", c("lightBlue")],
        ["--text-accent", c("blue")],
        ["--text-accent-hover", c("lightBlue")],
        ["--text-on-accent", c("bg")],
        ["--text-on-accent-inverted", c("fg")],
      ],
    },
    {
      title: "Surfaces and borders",
      rows: [
        ["--background-primary", c("bg")],
        ["--background-primary-alt", c("cursorLine")],
        ["--background-secondary", c("borderMuted")],
        ["--background-secondary-alt", c("borderMuted")],
        ["--background-modifier-hover", c("cursorLine")],
        ["--background-modifier-active-hover", c("braceMatch")],
        ["--background-modifier-border", c("borderMuted")],
        ["--background-modifier-border-hover", c("border")],
        ["--background-modifier-border-focus", c("blue")],
        ["--background-modifier-form-field", c("borderMuted")],
        ["--background-modifier-message", c("cursorLine")],
        ["--background-modifier-error", c("burntOrange")],
        ["--background-modifier-error-hover", c("burntOrange")],
        ["--background-modifier-success", c("green")],
        ["--background-modifier-cover", a("borderMuted", "cc")],
        ["--interactive-normal", c("cursorLine")],
        ["--interactive-hover", c("cursorLine")],
      ],
    },
    {
      title: "Text",
      rows: [
        ["--text-normal", c("fg")],
        ["--text-muted", c("comment")],
        ["--text-faint", c("fgDim")],
        ["--text-success", c("green")],
        ["--text-warning", c("brightYellow")],
        ["--text-error", c("burntOrange")],
        ["--text-selection", a("selection", "99")],
        ["--text-highlight-bg", c("searchBg")],
        ["--caret-color", c("caret")],
      ],
    },
    {
      title: "Headings (lime like functions, then cyan and blue)",
      rows: [
        ["--h1-color", c("lime")],
        ["--h2-color", c("lime")],
        ["--h3-color", c("cyan")],
        ["--h4-color", c("cyan")],
        ["--h5-color", c("blue")],
        ["--h6-color", c("comment")],
        ["--inline-title-color", c("lime")],
      ],
    },
    {
      title: "Inline formatting, links, tags",
      rows: [
        ["--bold-color", c("brightYellow")],
        ["--italic-color", c("brightYellow")],
        ["--link-color", c("blue")],
        ["--link-color-hover", c("lightBlue")],
        ["--link-external-color", c("cyan")],
        ["--link-external-color-hover", c("lightBlue")],
        ["--link-unresolved-color", c("brightYellow")],
        ["--link-unresolved-decoration-color", c("brightYellow")],
        ["--tag-color", c("green")],
        ["--tag-color-hover", c("green")],
        ["--tag-background", a("green", "22")],
        ["--tag-background-hover", a("green", "44")],
        ["--tag-border-color", a("green", "55")],
        ["--tag-border-color-hover", c("green")],
      ],
    },
    {
      title: "Blocks: quotes, rules, lists, checkboxes, tables",
      rows: [
        ["--blockquote-border-color", c("purple")],
        ["--blockquote-color", c("comment")],
        ["--blockquote-background-color", c("cursorLine")],
        ["--hr-color", c("border")],
        ["--list-marker-color", c("burntOrange")],
        ["--list-marker-color-hover", c("brightYellow")],
        ["--list-marker-color-collapsed", c("blue")],
        ["--checkbox-color", c("green")],
        ["--checkbox-color-hover", c("green")],
        ["--checkbox-border-color", c("fgDim")],
        ["--checkbox-border-color-hover", c("comment")],
        ["--checkbox-marker-color", c("bg")],
        ["--table-border-color", c("border")],
        ["--table-header-color", c("lime")],
        ["--table-header-background", c("cursorLine")],
        ["--table-header-border-color", c("border")],
        ["--table-row-alt-background", a("cursorLine", "80")],
        ["--table-row-background-hover", c("cursorLine")],
        ["--embed-background", c("borderMuted")],
      ],
    },
    {
      title: "Code",
      rows: [
        ["--code-background", c("borderMuted")],
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
      ],
    },
    {
      title: "Window chrome: title bar, ribbon, tabs, sidebar, status bar, icons",
      rows: [
        ["--titlebar-background", c("borderMuted")],
        ["--titlebar-background-focused", c("borderMuted")],
        ["--titlebar-text-color", c("comment")],
        ["--titlebar-text-color-focused", c("fg")],
        ["--ribbon-background", c("borderMuted")],
        ["--ribbon-background-collapsed", c("borderMuted")],
        ["--tab-container-background", c("borderMuted")],
        ["--tab-background-active", c("bg")],
        ["--tab-text-color", c("fgDim")],
        ["--tab-text-color-focused", c("comment")],
        ["--tab-text-color-focused-active", c("fg")],
        ["--tab-text-color-focused-active-current", c("blue")],
        ["--tab-outline-color", c("borderMuted")],
        ["--divider-color", c("borderMuted")],
        ["--divider-color-hover", c("blue")],
        ["--nav-item-color", c("comment")],
        ["--nav-item-color-hover", c("fg")],
        ["--nav-item-color-active", c("blue")],
        ["--nav-item-color-selected", c("fg")],
        ["--nav-item-color-highlighted", c("lime")],
        ["--nav-item-background-hover", c("cursorLine")],
        ["--nav-item-background-active", c("braceMatch")],
        ["--nav-item-background-selected", c("braceMatch")],
        ["--status-bar-background", c("borderMuted")],
        ["--status-bar-border-color", c("borderMuted")],
        ["--status-bar-text-color", c("comment")],
        ["--icon-color", c("comment")],
        ["--icon-color-hover", c("fg")],
        ["--icon-color-active", c("blue")],
        ["--icon-color-focused", c("fg")],
        ["--scrollbar-bg", "#00000000"],
        ["--scrollbar-thumb-bg", a("fgDim", "66")],
        ["--scrollbar-active-thumb-bg", a("fgDim", "aa")],
      ],
    },
    {
      title: "Popups, settings, graph, canvas",
      rows: [
        ["--prompt-background", c("cursorLine")],
        ["--prompt-border-color", c("border")],
        ["--setting-items-background", c("cursorLine")],
        ["--setting-items-border-color", c("borderMuted")],
        ["--graph-line", c("border")],
        ["--graph-node", c("comment")],
        ["--graph-node-unresolved", c("comment")],
        ["--graph-node-focused", c("blue")],
        ["--graph-node-tag", c("green")],
        ["--graph-node-attachment", c("yellow")],
        ["--graph-text", c("fg")],
        ["--canvas-background", c("bg")],
      ],
    },
  ];
}

/** Rules for the few things Obsidian has no variable for. */
export function obsidianRules(p: Palette): string[] {
  const c = (n: ColorName) => color(p, n);
  return [
    "/* Inline code: yellow like strings (Obsidian only has --code-normal, which also colours code blocks). */",
    ".markdown-rendered :not(pre) > code,",
    ".cm-s-obsidian span.cm-inline-code,",
    ".cm-inline-code {",
    `  color: ${c("yellow")};`,
    "}",
    "",
    "/* Highlights (==text==): dark text on the scheme's search-yellow. */",
    ".markdown-rendered mark,",
    ".cm-s-obsidian span.cm-highlight {",
    `  color: ${c("searchFg")};`,
    "}",
    "",
    "/* Empty tab ('no file open') title. */",
    ".empty-state-title {",
    `  color: ${c("lime")};`,
    "}",
    "",
  ];
}

export const obsidian: Target = {
  id: "obsidian",
  name: "Obsidian",
  files(p: Palette) {
    const css = ["/* Bigface — https://github.com/gjuoun/bigface-theme */", ".theme-dark {"];
    for (const group of obsidianVariables(p)) {
      css.push("", `  /* ${group.title} */`);
      for (const [name, value] of group.rows) css.push(`  ${name}: ${value};`);
    }
    css.push("}", "", ...obsidianRules(p));
    const manifest = {
      name: "Bigface",
      version: "0.2.0",
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
