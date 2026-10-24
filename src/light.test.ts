import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { contrastRatio } from "./contrast-math.ts";
import { darkenUntil, lightPath, MIN_CONTRAST, mix, renderLightJson, toOklch } from "./light.ts";
import { loadPalette, parseLightPalette } from "./palette.ts";

// palette/bigface-light.json is generated and committed, the same rule themes/ follows: the committed
// file must equal a fresh render, and CI regenerates then diffs.
const dark = await loadPalette();
const committed = readFileSync(lightPath, "utf8");

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
  });

  test("every text-bearing colour clears WCAG AA on the light canvas", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    const canvas = light.colors.bg.hex;
    for (const name of ["fg", "fgDim", "comment"] as const) {
      expect(contrastRatio(light.colors[name].hex, canvas), name).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
    }
    for (const name of [
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
    ] as const) {
      expect(contrastRatio(light.colors[name].hex, canvas), name).toBeGreaterThanOrEqual(
        MIN_CONTRAST,
      );
    }
  });

  test("a darkened accent keeps its hue (and its chroma is not invented)", () => {
    const light = parseLightPalette(JSON.parse(committed), dark);
    for (const name of ["blue", "green", "burntOrange", "purple", "lime"] as const) {
      const [lL, lC, lH] = toOklch(light.colors[name].hex);
      const [, dC, dH] = toOklch(dark.colors[name].hex);
      const delta = Math.min(Math.abs(lH - dH), 360 - Math.abs(lH - dH));
      expect(delta, name + " hue").toBeLessThanOrEqual(2);
      expect(lC, name + " chroma").toBeLessThanOrEqual(dC + 0.005);
    }
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
