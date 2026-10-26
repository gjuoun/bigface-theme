import { describe, expect, test } from "bun:test";
import { loadPalette, PaletteSchema, parseLightPalette, parsePalette } from "./palette.ts";
import { lookupSource } from "./scheme-xml.ts";
import { SCHEME_CARET } from "./seeds.ts";

const xml = await Bun.file(new URL("./fixtures/Bigface.original.xml", import.meta.url)).text();

describe("palette schema", () => {
  test("bigface.json parses and has every required token", async () => {
    const p = await loadPalette();
    expect(p.name).toBe("Bigface");
    expect(p.appearance).toBe("dark");
  });

  test("a missing token is rejected", async () => {
    const raw = await Bun.file(new URL("../palette/bigface.json", import.meta.url)).json();
    delete raw.colors.highlight;
    expect(PaletteSchema.safeParse(raw).success).toBe(false);
  });

  test("8-digit and 3-digit hex are rejected (pi and others refuse alpha)", async () => {
    const raw = await Bun.file(new URL("../palette/bigface.json", import.meta.url)).json();
    raw.colors.bg.hex = "#252925ff";
    expect(() => parsePalette(raw)).toThrow();
    raw.colors.bg.hex = "#fff";
    expect(() => parsePalette(raw)).toThrow();
  });

  test("a syntax role pointing at an unknown colour is rejected", async () => {
    const raw = await Bun.file(new URL("../palette/bigface.json", import.meta.url)).json();
    raw.syntax.keyword = "nope";
    expect(() => parsePalette(raw)).toThrow(/unknown colour/);
  });
});

describe("scheme tokens match original XML", () => {
  test("every jetbrains-sourced colour equals the original scheme value", async () => {
    const p = await loadPalette();
    const entries = [...Object.entries(p.colors), ...Object.entries(p.ansi)];
    const sourced = entries.filter(([, c]) => c.source.startsWith("jetbrains:"));
    // The dark seeds are the background and the ten accents. The canvas and the anchor are the scheme caret (seeds.ts).
    expect(sourced.length).toBe(11);
    const mismatches = sourced
      .map(([name, c]) => ({ name, want: lookupSource(xml, c.source), got: c.hex, src: c.source }))
      .filter((r) => r.want !== r.got);
    expect(mismatches).toEqual([]);
  });

  test("lookupSource restores stripped leading zeros", () => {
    expect(lookupSource(xml, "jetbrains:DEFAULT_KEYWORD#FOREGROUND")).toBe("#00b0ff");
    expect(lookupSource(xml, "jetbrains:DEFAULT_IDENTIFIER#FOREGROUND")).toBe("#00c853");
    expect(lookupSource(xml, "jetbrains:colors#CARET_ROW_COLOR")).toBe("#3b3c32");
  });
});
// --- Bigface Light: the second palette -----------------------------------------------------------
// A light palette borrows from the dark one instead of inventing: every colour is either an exact
// borrow (`dark:<name>`) or a value derived from one dark colour (`derived:<name>`). The generator
// (src/light.ts) computes the hexes; this schema only checks the shape and that borrows are honest.

/** Build a light fixture from the dark palette: every colour borrows its same-named dark colour. */
const lightFixture = (dark: Record<string, unknown>) => {
  const colors = Object.fromEntries(
    Object.keys(dark.colors as Record<string, unknown>).map((k) => [
      k,
      { hex: (dark.colors as Record<string, { hex: string }>)[k]?.hex, source: "dark:" + k },
    ]),
  );
  const ansi = Object.fromEntries(
    Object.keys(dark.ansi as Record<string, unknown>).map((k) => {
      const target = ((dark.ansi as Record<string, { source: string }>)[k]?.source ?? "").replace(
        /^alias:/,
        "",
      );
      return [
        k,
        {
          hex: (colors as Record<string, { hex: string }>)[target]?.hex,
          source: "alias:" + target,
        },
      ];
    }),
  );
  return { ...dark, name: "Bigface Light", appearance: "light", colors, ansi };
};

/** Set a colour's hex, keeping every ANSI slot that aliases it in step (parsePalette checks that). */
const setHex = (palette: Record<string, unknown>, name: string, hex: string) => {
  (palette.colors as Record<string, { hex: string }>)[name] = {
    ...((palette.colors as Record<string, { hex: string }>)[name] as { hex: string }),
    hex,
  };
  for (const slot of Object.values(
    palette.ansi as Record<string, { hex: string; source: string }>,
  )) {
    if (slot.source === "alias:" + name) slot.hex = hex;
  }
};

describe("light palette schema", () => {
  test("a light palette that borrows from the dark one parses", async () => {
    const dark = await Bun.file(new URL("../palette/bigface.json", import.meta.url)).json();
    const light = parseLightPalette(lightFixture(dark), await loadPalette());
    expect(light.name).toBe("Bigface Light");
    expect(light.appearance).toBe("light");
  });

  test("a dark: borrow whose hex differs from the dark colour is rejected", async () => {
    const dark = await Bun.file(new URL("../palette/bigface.json", import.meta.url)).json();
    const fixture = lightFixture(dark);
    // A colour and the ANSI slots aliasing it move together, so the borrow check is what fires —
    // not the alias-drift check parsePalette already runs.
    setHex(fixture, "blue", "#000000");
    expect(() => parseLightPalette(fixture, parsePalette(dark))).toThrow(/dark:blue/);
  });

  test("a derived: source naming an unknown dark colour is rejected", async () => {
    const dark = await Bun.file(new URL("../palette/bigface.json", import.meta.url)).json();
    const fixture = lightFixture(dark);
    (fixture.colors.blue as { source: string }).source = "derived:nope";
    expect(() => parseLightPalette(fixture, parsePalette(dark))).toThrow(/derived:nope/);
  });

  test("the dark palette still refuses a light name (one schema, both files)", async () => {
    const dark = await Bun.file(new URL("../palette/bigface.json", import.meta.url)).json();
    const fixture = lightFixture(dark);
    fixture.name = "Bigface";
    fixture.appearance = "dark";
    expect(() => parseLightPalette(fixture, parsePalette(dark))).toThrow(/light palette/);
  });
});

// Neutral collapse (plan 2026-10-25; Q2 = (b): caret is renamed paper, same value), then the panel tier (Jun, 2026-10-26).
// The palette keeps seven neutrals and the ten accents. The seven: bg (the dark seed), paper (the light canvas seed), panel
// (the surface tier, mix(fg, bg, 5)), fg, fgDim, border and highlight.
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
const NEUTRALS = ["bg", "panel", "fg", "fgDim", "border", "highlight"] as const;
const DERIVED = ["panel", "fg", "fgDim", "border", "highlight"] as const;

describe("neutral collapse: the role set", () => {
  test("REQUIRED_COLORS is exactly the six neutrals and the ten accents", async () => {
    const { REQUIRED_COLORS } = await import("./palette.ts");
    expect([...REQUIRED_COLORS].sort()).toEqual([...NEUTRALS, ...ACCENTS].sort());
  });

  test("the removed roles (braceMatch, cursorLine, selection, borderMuted, comment, caret) are in neither palette", async () => {
    const dark = await loadPalette();
    const light = JSON.parse(
      await Bun.file(new URL("../palette/bigface-light.json", import.meta.url)).text(),
    );
    for (const gone of [
      "braceMatch",
      "cursorLine",
      "selection",
      "borderMuted",
      "comment",
      "caret",
      "paper",
    ]) {
      expect(Object.keys(dark.colors), "dark " + gone).not.toContain(gone);
      expect(Object.keys(light.colors), "light " + gone).not.toContain(gone);
    }
  });

  test("the dark bg is the JetBrains seed and paper is gone; every other dark neutral is derived", async () => {
    const dark = await loadPalette();
    expect(dark.colors.bg.source.startsWith("jetbrains:")).toBe(true);
    expect(Object.keys(dark.colors)).not.toContain("paper");
    for (const k of DERIVED) expect(dark.colors[k].source, "dark " + k).toMatch(/^derived:/);
  });

  test("in light, bg is the scheme caret by source, paper is gone, and fg, fgDim, border, highlight and panel are derived", async () => {
    const light = JSON.parse(
      await Bun.file(new URL("../palette/bigface-light.json", import.meta.url)).text(),
    );
    expect(light.colors.bg.source).toBe("jetbrains:colors#CARET_COLOR");
    expect(light.colors.bg.hex).toBe(SCHEME_CARET);
    expect(Object.keys(light.colors)).not.toContain("paper");
    for (const k of DERIVED) expect(light.colors[k].source, "light " + k).toMatch(/^derived:/);
  });
});

// Neutral collapse, Step 4: each derived dark neutral reproduces from the generator, so no value is typed by hand.
describe("neutral collapse: the dark derivation", () => {
  test("renderDarkPalette reproduces the committed dark palette", async () => {
    const { renderDarkPalette } = await import("./dark-derive.ts");
    const committed = await loadPalette();
    expect(renderDarkPalette(committed)).toEqual(committed);
  });

  test("the dark fg reaches the target on bg in both settings: 12:1, and the fgDim floor is 4.5:1", async () => {
    const { contrastRatio } = await import("./contrast-math.ts");
    const p = await loadPalette();
    expect(contrastRatio(p.colors.fg.hex, p.colors.bg.hex)).toBeGreaterThanOrEqual(12);
    expect(contrastRatio(p.colors.fgDim.hex, p.colors.bg.hex)).toBeGreaterThanOrEqual(4.5);
  });
});

// Neutral collapse, Step 7: no ANSI slot and no syntax role names a removed colour, in either palette.
describe("neutral collapse: references", () => {
  test("no ANSI slot or syntax role in either palette names a removed colour", async () => {
    const removed = new Set([
      "braceMatch",
      "cursorLine",
      "selection",
      "borderMuted",
      "comment",
      "caret",
      "paper",
    ]);
    const dark = await loadPalette();
    const light = JSON.parse(
      await Bun.file(new URL("../palette/bigface-light.json", import.meta.url)).text(),
    );
    for (const p of [dark, light] as const) {
      for (const [slot, c] of Object.entries(p.ansi) as [string, { source: string }][]) {
        if (c.source.startsWith("alias:"))
          expect(removed.has(c.source.slice(6)), "ansi " + slot).toBe(false);
      }
      for (const [role, v] of Object.entries(p.syntax) as [string, string][])
        expect(removed.has(v), "syntax " + role).toBe(false);
    }
  });
});
