import { ansi, type ColorName, color, type Palette } from "../palette.ts";
import type { Target } from "./types.ts";

/** Slot order inside `colors=` (observed in published Raycast theme links, e.g. wesbos/cobalt2-raycast). */
export const RAYCAST_SLOTS = [
  "background",
  "backgroundSecondary",
  "text",
  "selection",
  "loader",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "magenta",
] as const;

export function raycastUrl(p: Palette): string {
  const c = (n: ColorName) => color(p, n);
  const slots = [
    c("bg"),
    c("bgPanel"),
    c("fg"),
    c("selection"),
    c("blue"),
    c("pink"),
    c("burntOrange"),
    c("yellow"),
    c("green"),
    c("blue"),
    c("purple"),
    ansi(p, "magenta"),
  ].map((hex) => `${hex.toUpperCase()}FF`);
  // Same shape as published links: '#' percent-encoded, ',' left as is.
  const colors = slots.map((h) => encodeURIComponent(h)).join(",");
  return `raycast://theme?version=1&name=Bigface&colors=${colors}&appearance=dark`;
}

export const raycast: Target = {
  id: "raycast",
  name: "Raycast",
  files(p: Palette) {
    return { "theme.url": `${raycastUrl(p)}\n` };
  },
};
