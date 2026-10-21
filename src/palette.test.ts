import { describe, expect, test } from "bun:test";
import { loadPalette, PaletteSchema, parsePalette } from "./palette.ts";
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
    const sourced = entries.filter(([, c]) => c.source !== "derived");
    expect(sourced.length).toBeGreaterThan(20);
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
