import paletteJson from "../../../palette/bigface.json";

export interface Color {
  hex: string;
  source: string;
}
export interface Palette {
  name: string;
  appearance: string;
  colors: Record<string, Color>;
  ansi: Record<string, Color>;
  syntax: Record<string, string>;
}

/** Read at build time, so the site can never drift from the palette. */
export const palette: Palette = paletteJson as Palette;

export const hex = (name: string): string => {
  const c = palette.colors[name];
  if (!c) throw new Error(`unknown colour ${name}`);
  return c.hex;
};
export const syntaxHex = (role: string): string => hex(palette.syntax[role] as string);

/** Where a colour comes from, for display. */
export const sourceLabel = (c: Color): string =>
  c.source.startsWith("alias:")
    ? `→ ${c.source.slice("alias:".length)}`
    : c.source.replace("jetbrains:", "");
