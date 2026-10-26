// The dark palette's neutral family (plan 2026-10-25, Steps 3 and 4). The seeds are JetBrains values and stay exact:
// the background, the paper (the scheme's caret foreground, renamed) and the ten accents. Every other neutral is
// derived from those seeds by deriveNeutrals in light.ts, the one formula both modes share. Re-running this on its own
// output gives the same file, so the generator is a function of the seeds.
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

type Named = { hex: string; source: string };

/** Old role names and their successors (plan Q2 = b; the neutral-collapse rulings). */
export const RENAMES: Record<string, string> = {
  caret: "paper",
  comment: "fgDim",
  borderMuted: "border",
  cursorLine: "highlight",
  selection: "highlight",
  braceMatch: "highlight",
};

export function renderDarkPalette(seed: Palette): Palette {
  const raw = seed.colors as Record<string, Named>;
  const paperSeed = raw.paper ?? raw.caret;
  const bg = raw.bg;
  if (!paperSeed || !bg) throw new Error("dark seed needs a background and a paper (caret) colour");
  const n = deriveNeutrals(paperSeed.hex, bg.hex);
  const colors: Record<string, Named> = {
    bg: { hex: bg.hex, source: bg.source },
    paper: { hex: paperSeed.hex, source: paperSeed.source },
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
      const to = RENAMES[target] ?? target;
      const resolved = (ordered as Record<string, Named>)[to];
      if (!resolved)
        throw new Error("ansi." + slot + " aliases " + to + ", which is not a dark colour");
      return [slot, { hex: resolved.hex, source: "alias:" + to }];
    }),
  );
  const syntax = Object.fromEntries(
    SYNTAX_ROLES.map((role) => {
      const v = seed.syntax[role] as string;
      return [role, RENAMES[v] ?? v];
    }),
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
