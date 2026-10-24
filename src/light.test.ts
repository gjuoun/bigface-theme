import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { contrastRatio } from "./contrast-math.ts";
import { darkenUntil, lightPath, MIN_CONTRAST, mix, renderLightJson } from "./light.ts";
import { loadPalette, parseLightPalette } from "./palette.ts";

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
  "lime",
  "yellow",
  "brightYellow",
  "burntOrange",
  "purple",
] as const;

/**
 * The measured contrast of each accent on the light canvas, recorded. Accepted below AA by Jun's ruling: vivid
 * accents are the palette's own hues on paper, and the text-critical roles keep AA. A change to any of these
 * numbers is a change to the palette, and this table is where it shows.
 */
const ACCENT_CONTRAST_ON_PAPER: Record<(typeof ACCENTS)[number], number> = {
  blue: 2.27,
  lightBlue: 1.86,
  paleBlue: 1.27,
  cyan: 1.54,
  green: 2.1,
  lime: 1.11,
  yellow: 1.27,
  brightYellow: 1.14,
  burntOrange: 2.92,
  purple: 2.66,
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
    expect(light.colors.blue?.hex).toBe("#0040ff");
  });

  test("every accent is an exact borrow of its dark colour", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    for (const name of ACCENTS) {
      expect(light.colors[name].hex, name).toBe(dark.colors[name].hex);
      expect(light.colors[name].source, name).toBe("dark:" + name);
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
    for (const name of ["fg", "fgDim", "comment"] as const) {
      expect(contrastRatio(light.colors[name].hex, canvas), name).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
    }
  });

  test("the canvas and the ink are unchanged: paper and the dark ink, never white", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    expect(light.colors.bg.hex).toBe(dark.colors.caret.hex);
    expect(light.colors.fg.hex).toBe(dark.colors.bg.hex);
    for (const c of Object.values(light.colors)) expect(c.hex.toLowerCase()).not.toBe("#ffffff");
  });

  test("the surface ladder climbs from the canvas to the ink", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    const ladder = ["bg", "cursorLine", "borderMuted", "braceMatch", "border", "selection", "fg"];
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
