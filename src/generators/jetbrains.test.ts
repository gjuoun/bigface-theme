import { expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { allColorValues, lookupSource } from "../scheme-xml.ts";
import { ORIGINAL_XML, renderJetBrains } from "./jetbrains.ts";

test("palette regenerates the original scheme with 0 colour differences", async () => {
  const out = renderJetBrains(await loadPalette());
  const a = allColorValues(ORIGINAL_XML);
  const b = allColorValues(out);
  expect(b.length).toBe(a.length);
  const diffs = a.map((v, i) => [v, b[i]] as const).filter(([x, y]) => x !== y);
  expect(diffs).toEqual([]);
  expect(a.length).toBeGreaterThan(150);
});

test("an unchanged palette gives back the original file byte for byte", async () => {
  expect(renderJetBrains(await loadPalette())).toBe(ORIGINAL_XML);
});

test("control: changing one token changes only that colour (and restores stripped zeros correctly)", async () => {
  const p = await loadPalette();
  p.colors.blue.hex = "#0a0b0c";
  const out = renderJetBrains(p);
  expect(lookupSource(out, p.colors.blue.source)).toBe("#0a0b0c");
  expect(out).toContain('value="a0b0c"');
  const a = allColorValues(ORIGINAL_XML);
  const b = allColorValues(out);
  const changed = a.filter((v, i) => v !== b[i]);
  expect(changed).toEqual(["#00b0ff"]);
});

test("two tokens that share a source must agree", async () => {
  const p = await loadPalette();
  // border and ansi.black both come from INDENT_GUIDE; make them disagree.
  p.ansi.black = { hex: "#010101", source: "jetbrains:colors#INDENT_GUIDE" };
  expect(() => renderJetBrains(p)).toThrow(/disagrees/);
});
