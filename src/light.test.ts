import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { contrastRatio } from "./contrast-math.ts";
import {
  ACCENT_OVERRIDES,
  darkenUntil,
  deriveNeutrals,
  fromOklch,
  lightPath,
  MIN_CONTRAST,
  mix,
  renderLightJson,
  renderSwatchSheet,
  toOklch,
} from "./light.ts";
import { loadPalette, parseLightPalette } from "./palette.ts";
import { SCHEME_CARET } from "./seeds.ts";

// palette/bigface-light.json is generated and committed, the same rule themes/ follows: the committed
// file must equal a fresh render, and CI regenerates then diffs.
const dark = await loadPalette();
const committed = readFileSync(lightPath, "utf8");

/** The accent family: borrowed exactly from the dark palette (ruled by Jun, 2026-10-24). */
const ACCENTS = [
  "blue",
  "lightBlue",
  "paleBlue",
  "cyan",
  "green",
  "yellow",
  "burntOrange",
  "purple",
] as const;

/**
 * The measured contrast of each accent on the light canvas, recorded. Accepted below AA by Jun's ruling: vivid
 * accents are the palette's own hues on paper, and the text-critical roles keep AA. A change to any of these
 * numbers is a change to the palette, and this table is where it shows.
 */
const ACCENT_CONTRAST_ON_PAPER: Record<(typeof ACCENTS)[number], number> = {
  blue: 4.5,
  lightBlue: 4.5,
  paleBlue: 4.51,
  cyan: 4.52,
  green: 4.52,
  yellow: 4,
  burntOrange: 4.52,
  purple: 4.51,
};

describe("bigface-light.json", () => {
  test("the committed file equals a fresh render", () => {
    expect(committed).toBe(renderLightJson(dark));
  });

  test("control: the render is a function of the dark palette, not hand-written", () => {
    const changed = structuredClone(dark);
    changed.colors.blue.hex = "#0040ff";
    const light = JSON.parse(renderLightJson(changed)) as {
      colors: Record<string, { hex: string }>;
    };
    expect(light.colors.blue?.hex).not.toBe(JSON.parse(committed).colors.blue.hex);
    expect(light.colors.blue?.hex).toBe("#0040ff"); // already under the floor: not darkened further
  });

  test("every accent keeps its hue and chroma, solved to the one contrast floor", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    for (const name of ACCENTS) {
      const [L, C, H] = toOklch(dark.colors[name].hex);
      const [lightL, lightC, lightH] = toOklch(light.colors[name].hex);
      expect(light.colors[name].source, name).toBe("derived:" + name);
      expect(lightL, name + " must darken").toBeLessThan(L);
      // At a lower L the sRGB gamut is narrower, so the hex round-trip clips chroma (yellow: 0.18 → 0.11).
      // It never grows, and the hue survives within a few degrees of clipping.
      expect(lightC, name + " chroma never grows").toBeLessThanOrEqual(C + 0.01);
      // Lowering L narrows the sRGB gamut, so the hex round-trip can clip the hue by a few degrees;
      // an override (yellow's gold) starts from a warmer hue on purpose.
      const override = ACCENT_OVERRIDES[name];
      if (override) {
        expect(lightH, name + " warmer than the dark accent").toBeLessThan(H);
        expect(Math.abs(lightH - override.hue), name + " near its override hue").toBeLessThan(40);
      } else {
        expect(Math.abs(lightH - H), name + " keeps hue within clipping").toBeLessThan(15);
      }
      expect(
        contrastRatio(light.colors[name].hex, light.colors.bg.hex),
        name + " clears its floor",
      ).toBeGreaterThanOrEqual(override?.floor ?? 4.5);
    }
  });

  test("the accent contrast on paper is what was recorded, and the tradeoff is explicit", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    const canvas = light.colors.bg.hex;
    for (const name of ACCENTS) {
      const measured = Math.round(contrastRatio(light.colors[name].hex, canvas) * 100) / 100;
      expect(measured, name).toBe(ACCENT_CONTRAST_ON_PAPER[name]);
    }
  });

  test("text-critical colours still clear WCAG AA on the light canvas", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    const canvas = light.colors.bg.hex;
    for (const name of ["fg", "fgDim"] as const) {
      expect(contrastRatio(light.colors[name].hex, canvas), name).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
    }
  });

  test("the canvas and the ink are unchanged: the scheme caret and the dark ink, never white", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    expect(light.colors.bg.hex).toBe(SCHEME_CARET);
    expect(light.colors.fg.hex).toBe(deriveNeutrals(dark.colors.bg.hex, SCHEME_CARET).fg);
    for (const c of Object.values(light.colors)) expect(c.hex.toLowerCase()).not.toBe("#ffffff");
  });

  test("the surface ladder climbs from the canvas to the ink", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    const ladder = ["bg", "border", "highlight", "fg"];
    const colors = light.colors as Record<string, { hex: string }>;
    const lum = (name: string) => contrastRatio((colors[name] as { hex: string }).hex, "#000000");
    for (let i = 1; i < ladder.length; i++) {
      expect(lum(ladder[i] as string), ladder[i]).toBeLessThan(lum(ladder[i - 1] as string));
    }
  });

  test("a colour already dark enough is not darkened further", () => {
    expect(darkenUntil("#252925", "#f8f8f0")).toBe("#252925");
  });

  test("mix() moves a colour toward the ink as the percentage rises", () => {
    const five = contrastRatio(mix("#252925", "#f8f8f0", 5), "#f8f8f0");
    const twenty = contrastRatio(mix("#252925", "#f8f8f0", 20), "#f8f8f0");
    expect(twenty).toBeGreaterThan(five);
  });
});

// Neutral collapse: the derivation is a function of bg. Changing the dark bg must move every derived neutral in light.
describe("neutral collapse: derivation", () => {
  test("changing the dark bg changes every derived neutral in the light palette", () => {
    const changed = structuredClone(dark);
    changed.colors.bg.hex = "#101110";
    const before = JSON.parse(committed).colors as Record<string, { hex: string }>;
    const after = JSON.parse(renderLightJson(changed)).colors as Record<string, { hex: string }>;
    // panel is checked below: it is 5% of the light fg, and the contrast-pinned fg moves by less than one 8-bit step here.
    for (const k of ["fg", "fgDim", "border", "highlight"]) {
      expect(after[k]?.hex, k).not.toBe(before[k]?.hex);
    }
  });

  test("the swatch sheet has one row per light colour: fourteen", () => {
    const rows = renderSwatchSheet(dark).match(/<tr data-swatch=/g) ?? [];
    expect(rows.length).toBe(14);
  });

  test("the swatch sheet lists the six neutrals lightest first, then the eight accents", () => {
    const names = [...renderSwatchSheet(dark).matchAll(/<tr data-swatch="([a-zA-Z]+)"/g)].map(
      (m) => m[1],
    );
    expect(names).toEqual(["bg", "panel", "border", "highlight", "fgDim", "fg", ...ACCENTS]);
  });

  test("the panel follows the canvas: mix(fg, canvas, 5) moves when the canvas moves", () => {
    const ink = dark.colors.bg.hex;
    const before = deriveNeutrals(ink, SCHEME_CARET);
    const after = deriveNeutrals(ink, "#f0f0e6");
    expect(after.panel).not.toBe(before.panel);
    expect(after.panel).toBe(mix(after.fg, "#f0f0e6", 5));
  });

  test("the panel tier is mix(fg, bg, 5) in light: the one formula, not a typed hex", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    expect(light.colors.panel.hex).toBe(mix(light.colors.fg.hex, light.colors.bg.hex, 5));
    expect(light.colors.panel.source).toBe("derived:panel");
  });
});
