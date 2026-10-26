// Bigface Light, generated from the dark palette by stated rules — never hand-edited.
//
//   bun run light                 write palette/bigface-light.json
//   bun run light --check         fail when the committed file is stale (CI uses this)
//   bun run light --html <file>   write a swatch sheet: each light colour on the light canvas with its
//                                 contrast ratio, beside the dark colour it came from
//
// Why a rule instead of 20 hand-picked hexes: the light palette has to stay a function of the dark one,
// so a palette edit upstream flows into both without anyone re-picking colours. Every value is either
// an exact borrow (`dark:<name>`: the accent family, and the canvas and ink) or computed from one dark colour
// (`derived:<name>`: the surface ladder and the two muted greys, checked against the contrast floor below).
import { writeFileSync } from "node:fs";
import { contrastRatio } from "./contrast-math.ts";
import {
  ANSI_NAMES,
  loadPalette,
  type Palette,
  parseLightPalette,
  REQUIRED_COLORS,
  SYNTAX_ROLES,
} from "./palette.ts";

/** Every text-bearing colour clears WCAG AA on the light canvas. */
export const MIN_CONTRAST = 4.5;

// --- sRGB <-> OKLab / OKLCH. Mixing in OKLab keeps a blend perceptually even across hues; lowering
// lightness in OKLCH keeps a hue and its chroma while it is darkened, which is what a light-mode
// accent is: the same colour, dark enough to read on a pale canvas.
const toLinear = (v: number): number => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (v: number): number => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};
const rgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const hex = (channels: [number, number, number]): string =>
  "#" + channels.map((v) => v.toString(16).padStart(2, "0")).join("");

export function toOklab(h: string): [number, number, number] {
  const [r, g, b] = rgb(h).map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

const oklabToLinear = (L: number, A: number, B: number): [number, number, number] => {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};

export function fromOklab([L, A, B]: [number, number, number]): string {
  return hex(oklabToLinear(L, A, B).map(fromLinear) as [number, number, number]);
}

/**
 * The most chroma a hue can carry at this lightness before sRGB clips it. Darkening a bright accent
 * without this pushes it out of gamut, and the per-channel clamp that follows shifts the hue several
 * degrees (blue → teal-ish); clamping chroma instead keeps the colour the user picked, just darker.
 */
const clampChroma = (L: number, C: number, H: number): number => {
  const at = (c: number) =>
    oklabToLinear(L, c * Math.cos((H * Math.PI) / 180), c * Math.sin((H * Math.PI) / 180));
  const fits = (c: number) => at(c).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  if (fits(C)) return C;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
};

export const toOklch = (h: string): [number, number, number] => {
  const [L, A, B] = toOklab(h);
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180) / Math.PI];
};
export const fromOklch = ([L, C, H]: [number, number, number]): string =>
  fromOklab([L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)]);

/** `fg` over `bg` at `pct` percent, mixed in OKLab. */
export function mix(fg: string, bg: string, pct: number): string {
  const a = toOklab(fg);
  const b = toOklab(bg);
  const t = pct / 100;
  return fromOklab([
    a[0] * t + b[0] * (1 - t),
    a[1] * t + b[1] * (1 - t),
    a[2] * t + b[2] * (1 - t),
  ]);
}

/** The colour with its OKLCH lightness lowered (hue and chroma kept) until it clears `floor` on `bg`. */
/**
 * The colour with its OKLCH lightness lowered until it clears `floor` on `bg`. Hue and chroma are kept:
 * the chroma is re-maximised against sRGB at every step, so the colour darkens without clipping.
 */
export function darkenUntil(hexIn: string, bg: string, floor = MIN_CONTRAST): string {
  let [L, C, H] = toOklch(hexIn);
  let out = fromOklch([L, clampChroma(L, C, H), H]);
  while (contrastRatio(out, bg) < floor && L > 0.05) {
    L -= 0.004;
    out = fromOklch([L, clampChroma(L, C, H), H]);
  }
  return out;
}

/** Contrast fg reaches on its own background, in both modes (Jun, 2026-10-26: T = 12). */
export const FG_TARGET = 12;

/** The smallest share of `anchor` mixed into `base` whose contrast on `base` reaches `target` (bisection). */
export function solveShare(anchor: string, base: string, target: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (contrastRatio(mix(anchor, base, mid * 100), base) >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * The one neutral rule (plan 2026-10-25; Jun's ruling): every neutral and fg derives from a background by this
 * formula, run in both modes with the mode's own bg. `anchor` is the palette's OTHER seed: the dark paper for the
 * dark background, the dark background for the light one. fg is the anchor mixed into bg at the smallest share that
 * gives fg FG_TARGET on bg; fgDim is fg mixed into bg at the smallest share that gives MIN_CONTRAST; border and
 * highlight are fg mixed into bg at 14% and 22% (Jun's Q3 and Q4); panel is the surface tier, fg mixed into bg at 5%
 * (Jun, 2026-10-26: the one surface role every surface consumer reads).
 *
 * Rule for the fill ink (Jun, 2026-10-26): the ink on a fill is the mode's own darkest readable value. Light uses its fg;
 * dark keeps the dark canvas. Dark's fg cannot be the ink on the blue fill: it measures 1.98:1 on #00b0ff.
 */
export function deriveNeutrals(
  anchor: string,
  base: string,
): { fg: string; fgDim: string; border: string; highlight: string; panel: string } {
  const fg = mix(anchor, base, solveShare(anchor, base, FG_TARGET) * 100);
  const fgDim = mix(fg, base, solveShare(fg, base, MIN_CONTRAST) * 100);
  return {
    fg,
    fgDim,
    border: mix(fg, base, 14),
    highlight: mix(fg, base, 22),
    panel: mix(fg, base, 5),
  };
}

/** The accent family: EXACT borrows of the dark colour of the same name (`dark:<name>`), ruled 2026-10-24. */
const BORROWED = [
  "blue",
  "lightBlue",
  "paleBlue",
  "cyan",
  "green",
  "lime",
  "yellow",
  "brightYellow",
  "burntOrange",
  "purple",
] as const;

/** Build the light palette from the dark one. Deterministic: same input, same file, byte for byte. */
export function renderLightPalette(dark: Palette): Palette {
  const paper = dark.colors.paper.hex; // the light canvas: the dark paper seed, borrowed
  const ink = dark.colors.bg.hex; // the dark background: the anchor of the light neutral family
  const n = deriveNeutrals(ink, paper);
  const colors: Record<string, { hex: string; source: string }> = {};
  colors.bg = { hex: paper, source: "dark:paper" };
  colors.paper = { hex: paper, source: "dark:paper" };
  colors.fg = { hex: n.fg, source: "derived:fg" };
  colors.fgDim = { hex: n.fgDim, source: "derived:fgDim" };
  colors.border = { hex: n.border, source: "derived:border" };
  colors.highlight = { hex: n.highlight, source: "derived:highlight" };
  colors.panel = { hex: n.panel, source: "derived:panel" };
  for (const key of BORROWED) colors[key] = { hex: dark.colors[key].hex, source: `dark:${key}` };
  const ordered = Object.fromEntries(
    REQUIRED_COLORS.map((k) => [k, colors[k] as { hex: string; source: string }]),
  );
  const ansi = Object.fromEntries(
    ANSI_NAMES.map((slot) => {
      const source = dark.ansi[slot].source;
      const target = source.startsWith("alias:") ? source.slice("alias:".length) : slot;
      const borrowed = ordered[target];
      if (!borrowed) throw new Error(`ansi.${slot} -> ${source}: no light colour named ${target}`);
      return [slot, { hex: borrowed.hex, source: `alias:${target}` }];
    }),
  );
  const syntax = Object.fromEntries(
    SYNTAX_ROLES.map((role) => [role, dark.syntax[role] as string]),
  );
  const light: Palette = {
    name: "Bigface Light",
    appearance: "light",
    colors: ordered,
    ansi,
    syntax,
  } as Palette;
  return parseLightPalette(light, dark);
}

export const renderLightJson = (dark: Palette): string =>
  JSON.stringify(renderLightPalette(dark), null, 2) + "\n";

/** One swatch per colour: the light value on the light canvas, and the dark colour it came from. */
export function renderSwatchSheet(dark: Palette): string {
  const light = renderLightPalette(dark);
  const row = ([name, c]: [string, { hex: string; source: string }]): string => {
    const from = c.source.split(":")[1] as string;
    const darkHex = (dark.colors as Record<string, { hex: string }>)[from]?.hex ?? c.hex;
    const ratio = contrastRatio(c.hex, light.colors.bg.hex).toFixed(2);
    return [
      `    <tr data-swatch="${name}">`,
      `      <th scope="row">${name}</th>`,
      `      <td><span class="chip" style="background:${c.hex}"></span><code>${c.hex}</code></td>`,
      `      <td><span class="chip" style="background:${darkHex}"></span><code>${darkHex}</code></td>`,
      `      <td>${c.source}</td>`,
      `      <td>${ratio}:1</td>`,
      `    </tr>`,
    ].join("\n");
  };
  const rows = Object.entries(light.colors).map(row).join("\n");
  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8"><title>Bigface Light</title>',
    "<style>",
    `  body { background: ${light.colors.bg.hex}; color: ${light.colors.fg.hex}; font: 14px/1.5 ui-monospace, monospace; padding: 2rem; }`,
    "  table { border-collapse: collapse; }",
    "  th, td { text-align: left; padding: .35rem .8rem; border-bottom: 1px solid " +
      light.colors.border.hex +
      "; }",
    "  .chip { display: inline-block; width: 1.1rem; height: 1.1rem; border-radius: 3px; vertical-align: -2px; margin-right: .5rem; border: 1px solid " +
      light.colors.border.hex +
      "; }",
    "</style></head><body>",
    "<h1>Bigface Light</h1>",
    "<p>Generated from the dark palette: each row is the light value, the dark colour it came from, the rule, and its contrast on the light canvas.</p>",
    "<table><thead><tr><th>colour</th><th>light</th><th>from</th><th>rule</th><th>on canvas</th></tr></thead><tbody>",
    rows,
    "</tbody></table></body></html>",
    "",
  ].join("\n");
}

const here = import.meta.dir;
export const lightPath = new URL("../palette/bigface-light.json", import.meta.url);
const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

if (import.meta.main) {
  void here;
  const dark = await loadPalette();
  const next = renderLightJson(dark);
  if (process.argv.includes("--check")) {
    const current = await Bun.file(lightPath).text();
    if (current !== next) {
      console.error(
        "palette/bigface-light.json is stale: run `bun run light` and commit the result",
      );
      process.exit(1);
    }
    console.log("palette/bigface-light.json is up to date");
  } else if (arg("html")) {
    const out = arg("html") as string;
    writeFileSync(out, renderSwatchSheet(dark));
    console.log(`wrote ${out} (${Object.keys(dark.colors).length} colours)`);
  } else {
    await Bun.write(lightPath, next);
    console.log(
      `wrote palette/bigface-light.json (${Object.keys(dark.colors).length} colours, ${Object.keys(dark.ansi).length} ansi)`,
    );
  }
}
