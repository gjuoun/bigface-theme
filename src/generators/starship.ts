import { ANSI_NAMES, ansi, type ColorName, color, type Palette } from "../palette.ts";
import type { Target } from "./types.ts";

/** starship names → ANSI slot. Defining them in the palette recolours every module that says `green`, `cyan`, … */
const BASE: Record<string, (typeof ANSI_NAMES)[number]> = {
  black: "black",
  red: "red",
  green: "green",
  yellow: "yellow",
  blue: "blue",
  purple: "magenta",
  cyan: "cyan",
  white: "white",
  "bright-black": "brightBlack",
  "bright-red": "brightRed",
  "bright-green": "brightGreen",
  "bright-yellow": "brightYellow",
  "bright-blue": "brightBlue",
  "bright-purple": "brightMagenta",
  "bright-cyan": "brightCyan",
  "bright-white": "brightWhite",
};

const NAMED: [string, ColorName][] = [
  ["bigface_bg", "bg"],
  ["bigface_fg", "fg"],
  ["bigface_blue", "blue"],
  ["bigface_lime", "lime"],
  ["bigface_green", "green"],
  ["bigface_yellow", "yellow"],
  ["bigface_orange", "burntOrange"],
  ["bigface_pink", "pink"],
  ["bigface_cyan", "cyan"],
  ["bigface_purple", "purple"],
  ["bigface_comment", "comment"],
];

export const starship: Target = {
  id: "starship",
  name: "starship",
  files(p: Palette) {
    const lines = [
      "# Bigface — https://github.com/gjuoun/bigface-theme",
      "# Paste into ~/.config/starship.toml (the `palette` line must stay above any [table]).",
      'palette = "bigface"',
      "",
      "[palettes.bigface]",
      ...Object.entries(BASE).map(([k, v]) => `${k.padEnd(14)} = "${ansi(p, v)}"`),
      ...NAMED.map(([k, v]) => `${k.padEnd(14)} = "${color(p, v)}"`),
    ];
    return { "palette.toml": `${lines.join("\n")}\n` };
  },
};
