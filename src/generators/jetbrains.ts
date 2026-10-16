import { readFileSync } from "node:fs";
import type { Palette } from "../palette.ts";
import { replaceSource } from "../scheme-xml.ts";
import type { Target } from "./types.ts";

export const ORIGINAL_XML = readFileSync(
  new URL("../fixtures/Bigface.original.xml", import.meta.url),
  "utf8",
);

/**
 * Start from the original scheme and write each palette colour back to the place it came from.
 * Tokens marked `derived` have no home in the scheme and are skipped.
 */
export function renderJetBrains(p: Palette, base = ORIGINAL_XML): string {
  let xml = base;
  const seen = new Map<string, string>();
  const entries = [...Object.entries(p.colors), ...Object.entries(p.ansi)];
  for (const [name, c] of entries) {
    if (c.source === "derived") continue;
    const prev = seen.get(c.source);
    if (prev && prev !== c.hex) {
      throw new Error(
        `${name} disagrees with another token about ${c.source}: ${prev} vs ${c.hex}`,
      );
    }
    seen.set(c.source, c.hex);
    xml = replaceSource(xml, c.source, c.hex);
  }
  return xml;
}

export const jetbrains: Target = {
  id: "jetbrains",
  name: "JetBrains IDEs",
  files(p: Palette) {
    return { "Bigface.xml": renderJetBrains(p) };
  },
};
