import { type ColorName, color, type Palette } from "../palette.ts";
import type { Target } from "./types.ts";

/** Order of the legacy Slack theme string (confirmed from mjswensen/themer's slack template). */
export const SLACK_ORDER = [
  "Column BG",
  "Menu BG Hover",
  "Active Item",
  "Active Item Text",
  "Hover Item",
  "Text Color",
  "Active Presence",
  "Mention Badge",
] as const;

export const slack: Target = {
  id: "slack",
  name: "Slack",
  files(p: Palette) {
    const c = (n: ColorName) => color(p, n);
    const values = [
      c("borderMuted"), // Column BG
      c("cursorLine"), // Menu BG Hover
      c("blue"), // Active Item
      c("bg"), // Active Item Text
      c("braceMatch"), // Hover Item
      c("fg"), // Text Color
      c("green"), // Active Presence
      c("burntOrange"), // Mention Badge
    ];
    return { "theme.txt": `${values.join(",")}\n` };
  },
};
