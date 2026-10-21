import { ansi, type ColorName, color, type Palette } from "../palette.ts";
import type { Target } from "./types.ts";

/** herdr's `[theme.custom]` keys → Bigface colour names (same key set as a hand-written herdr config). */
const MAP: [key: string, from: ColorName | `ansi.${string}`, note: string][] = [
  ["accent", "blue", "links, focus rings"],
  ["text", "fg", "primary foreground"],
  ["subtext0", "comment", "secondary foreground"],
  ["overlay1", "comment", "dimmer tier"],
  ["overlay0", "fgDim", "muted tokens, separators"],
  ["panel_bg", "bg", "main pane background"],
  ["sidebar_bg", "borderMuted", "sidebar, darker than panel"],
  ["active_row_bg", "cursorLine", "focused / hovered sidebar row"],
  ["selection_bg", "selection", "text selection"],
  ["surface0", "cursorLine", "raised surface"],
  ["surface1", "cursorLine", "overlay surface"],
  ["surface_dim", "borderMuted", "inset surface"],
  ["green", "green", "success"],
  ["yellow", "yellow", "attention"],
  ["red", "burntOrange", "danger"],
  ["blue", "blue", "accent blue"],
  ["teal", "cyan", "info"],
  ["peach", "brightYellow", "warning / severe"],
  ["mauve", "purple", "merged / done"],
];

export const HERDR_KEYS = MAP.map(([k]) => k);

export const herdr: Target = {
  id: "herdr",
  name: "herdr",
  files(p: Palette) {
    const lines = [
      "# Bigface for herdr — https://github.com/gjuoun/bigface-theme",
      "# Paste into ~/.config/herdr/config.toml next to your [theme] table (keep `name`; this layers on top).",
      "[theme.custom]",
      ...MAP.map(([key, from, note]) => {
        const hex = from.startsWith("ansi.")
          ? ansi(p, from.slice(5) as never)
          : color(p, from as ColorName);
        return `${key.padEnd(13)} = "${hex}" # ${note}`;
      }),
    ];
    return { "theme.toml": `${lines.join("\n")}\n` };
  },
};
