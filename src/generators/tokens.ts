// The machine-readable token contract every port and the npm package agree on.
// One file per mode: resolved hexes, provenance, the twelve syntax roles, and the
// semantic intents ports share (statuses, diff, search) so a new consumer never
// re-picks a colour by hand. Palette stays the source — this file is generated.
import { renderLightPalette } from "../light.ts";
import { ANSI_NAMES, type Palette, REQUIRED_COLORS, SYNTAX_ROLES } from "../palette.ts";
import type { Target } from "./types.ts";

/** Cross-port semantic intents: which palette colour a concept takes (name + resolved hex). */
const SEMANTIC = {
  "status.success": "green",
  "status.info": "blue",
  "status.warning": "yellow",
  "status.error": "burntOrange",
  "status.hint": "fgDim",
  "diff.added": "green",
  "diff.removed": "burntOrange",
  "diff.context": "fgDim",
  "git.added": "green",
  "git.deleted": "burntOrange",
  "git.renamed": "green",
  "search.match": "yellow",
  link: "blue",
} as const;

const tokensOf = (p: Palette) => ({
  name: p.name,
  appearance: p.appearance,
  colors: Object.fromEntries(REQUIRED_COLORS.map((n) => [n, p.colors[n]])),
  ansi: Object.fromEntries(ANSI_NAMES.map((n) => [n, p.ansi[n]])),
  /** Syntax role → { colour name, resolved hex }. */
  syntax: Object.fromEntries(
    SYNTAX_ROLES.map((r) => {
      const name = p.syntax[r];
      const c = (p.colors as Record<string, { hex: string }>)[name];
      if (!c) throw new Error(`syntax.${r} → unknown colour ${name}`);
      return [r, { name, hex: c.hex }];
    }),
  ),
  /** Shared semantic intents → { colour name, resolved hex }. Ports may layer
   *  specifics on top (alphas, borders) but the base colour is this one. */
  semantic: Object.fromEntries(
    Object.entries(SEMANTIC).map(([role, name]) => {
      const c = (p.colors as Record<string, { hex: string }>)[name];
      if (!c) throw new Error(`semantic.${role} → unknown colour ${name}`);
      return [role, { name, hex: c.hex }];
    }),
  ),
});

export const tokens: Target = {
  id: "tokens",
  name: "Design tokens",
  files(p: Palette) {
    return {
      "bigface.json": `${JSON.stringify(tokensOf(p), null, 2)}
`,
      "bigface-light.json": `${JSON.stringify(tokensOf(renderLightPalette(p)), null, 2)}
`,
    };
  },
};
