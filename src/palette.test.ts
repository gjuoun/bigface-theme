import { describe, expect, test } from "bun:test";
import { loadPalette, PaletteSchema, parseLightPalette, parsePalette } from "./palette.ts";
import { lookupSource } from "./scheme-xml.ts";

const xml = await Bun.file(new URL("./fixtures/Bigface.original.xml", import.meta.url)).text();

describe("palette schema", () => {
  test("bigface.json parses and has every required token", async () => {
    const p = await loadPalette();
    expect(p.name).toBe("Bigface");
    expect(p.appearance).toBe("dark");
  });

  test("a missing token is rejected", async () => {
    const raw = await Bun.file(new URL("../palette/bigface.json", import.meta.url)).json();
    delete raw.colors.cursorLine;
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
    expect(sourced.length).toBe(20);
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
    setHex(fixture, "caret", "#000000");
    expect(() => parseLightPalette(fixture, parsePalette(dark))).toThrow(/dark:caret/);
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
