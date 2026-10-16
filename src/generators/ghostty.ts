import { ANSI_NAMES, ansi, color, type Palette } from "../palette.ts";
import type { Target } from "./types.ts";

export const ghostty: Target = {
  id: "ghostty",
  name: "Ghostty",
  files(p: Palette) {
    const lines = [
      "# Bigface — https://github.com/gjuoun/bigface-theme",
      ...ANSI_NAMES.map((n, i) => `palette = ${i}=${ansi(p, n)}`),
      `background = ${color(p, "bg")}`,
      `foreground = ${color(p, "fg")}`,
      `cursor-color = ${color(p, "caret")}`,
      `cursor-text = ${color(p, "bg")}`,
      `selection-background = ${color(p, "selection")}`,
      `selection-foreground = ${color(p, "fg")}`,
    ];
    return { Bigface: `${lines.join("\n")}\n` };
  },
};
