import { expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { tokens } from "./tokens.ts";

const out = async (file: string) =>
  JSON.parse((tokens.files(await loadPalette()) as Record<string, string>)[file] as string);

test("dark and light files carry the palette verbatim", async () => {
  const p = await loadPalette();
  const dark = await out("bigface.json");
  expect(dark.name).toBe("Bigface");
  expect(dark.appearance).toBe("dark");
  expect(Object.keys(dark.colors)).toEqual(Object.keys(p.colors));
  expect(dark.colors.bg.hex).toBe("#252925");
  expect(Object.keys(dark.ansi).length).toBe(16);
  const light = await out("bigface-light.json");
  expect(light.appearance).toBe("light");
  expect(Object.keys(light.colors).length).toBe(Object.keys(p.colors).length);
});

test("syntax and semantic entries resolve to real palette colours", async () => {
  const dark = await out("bigface.json");
  const names = new Set(Object.keys(dark.colors));
  for (const [role, v] of Object.entries(dark.syntax) as [
    string,
    { name: string; hex: string },
  ][]) {
    expect(names.has(v.name), role).toBe(true);
    expect(v.hex, role).toBe(dark.colors[v.name].hex);
  }
  for (const [role, v] of Object.entries(dark.semantic) as [
    string,
    { name: string; hex: string },
  ][]) {
    expect(names.has(v.name), role).toBe(true);
    expect(v.hex, role).toBe(dark.colors[v.name].hex);
  }
  // The two roles this file was built for: functions carry the green, variables the ink.
  expect(dark.syntax.function.hex).toBe("#00c853");
  expect(dark.syntax.variable.hex).toBe("#e8e9e1");
});
