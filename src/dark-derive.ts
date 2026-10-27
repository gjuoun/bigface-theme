// The dark palette's neutral family (plan 2026-10-25; Jun, 2026-10-26). The seeds are JetBrains values and stay exact:
// the background and the ten accents. The scheme's caret colour (SCHEME_CARET, read from the original scheme) is the anchor
// the neutrals derive from. Every other neutral is derived by deriveNeutrals in light.ts, the one formula both modes share.
// Re-running this on its own output gives the same file, so the generator is a function of the seeds.
//
//   bun run src/dark-derive.ts           write palette/bigface.json
//   bun run src/dark-derive.ts --check   fail when the committed file is stale
import { readFileSync, writeFileSync } from "node:fs";
import { deriveNeutrals } from "./light.ts";
import {
  ANSI_NAMES,
  type Palette,
  parsePalette,
  REQUIRED_COLORS,
  SYNTAX_ROLES,
} from "./palette.ts";
import { SCHEME_CARET } from "./seeds.ts";

type Named = { hex: string; source: string };

export function renderDarkPalette(seed: Palette): Palette {
  const raw = seed.colors as Record<string, Named>;
  const bg = raw.bg;
  if (!bg) throw new Error("dark seed needs a background colour");
  const n = deriveNeutrals(SCHEME_CARET, bg.hex);
  const colors: Record<string, Named> = {
    bg: { hex: bg.hex, source: bg.source },
    panel: { hex: n.panel, source: "derived:panel" },
    fg: { hex: n.fg, source: "derived:fg" },
    fgDim: { hex: n.fgDim, source: "derived:fgDim" },
    border: { hex: n.border, source: "derived:border" },
    highlight: { hex: n.highlight, source: "derived:highlight" },
  };
  for (const key of REQUIRED_COLORS) if (!colors[key] && raw[key]) colors[key] = raw[key];
  const ordered = Object.fromEntries(REQUIRED_COLORS.map((k) => [k, colors[k] as Named]));
  const ansi = Object.fromEntries(
    ANSI_NAMES.map((slot) => {
      const s = seed.ansi[slot] as Named;
      if (!s.source.startsWith("alias:")) return [slot, s];
      const target = s.source.slice("alias:".length);
      const resolved = (ordered as Record<string, Named>)[target];
      if (!resolved)
        throw new Error("ansi." + slot + " aliases " + target + ", which is not a dark colour");
      return [slot, { hex: resolved.hex, source: "alias:" + target }];
    }),
  );
  const syntax = Object.fromEntries(
    SYNTAX_ROLES.map((role) => [role, seed.syntax[role] as string]),
  );
  return parsePalette({
    name: seed.name,
    appearance: seed.appearance,
    colors: ordered,
    ansi,
    syntax,
  });
}

const path = new URL("../palette/bigface.json", import.meta.url);
if (import.meta.main) {
  const seed = JSON.parse(readFileSync(path, "utf8")) as Palette;
  const next = JSON.stringify(renderDarkPalette(seed), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== next) {
      console.error("palette/bigface.json is stale: run bun run src/dark-derive.ts");
      process.exit(1);
    }
    console.log("palette/bigface.json is up to date");
  } else {
    writeFileSync(path, next);
    console.log("wrote palette/bigface.json (" + REQUIRED_COLORS.length + " colours)");
  }
}
