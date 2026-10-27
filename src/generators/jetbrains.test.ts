import { expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { allColorValues, lookupSource } from "../scheme-xml.ts";
import { LEGACY_ADDRESSES, ORIGINAL_XML, renderJetBrains } from "./jetbrains.ts";

// Plan 2026-10-25, Step 9. The scheme follows the palette: its JetBrains-sourced colours and the legacy addresses of
// the collapsed neutrals (the transition shim in jetbrains.ts) read back exactly as the palette has them. The
// round trip against the ORIGINAL scheme is no longer byte-identical, because the derived neutrals moved on purpose.

test("every JetBrains-sourced colour and every legacy address reads back as the palette's value", async () => {
  const p = await loadPalette();
  const out = renderJetBrains(p);
  for (const [name, c] of Object.entries(p.colors)) {
    if (c.source.startsWith("jetbrains:")) expect(lookupSource(out, c.source), name).toBe(c.hex);
  }
  for (const [source, role] of LEGACY_ADDRESSES)
    expect(lookupSource(out, source), source + " <- " + role).toBe(p.colors[role].hex);
});

test("strings take the single yellow: DEFAULT_STRING writes #ffeb3b, and the 2018 fixture is untouched", async () => {
  const p = await loadPalette();
  const out = renderJetBrains(p);
  expect(lookupSource(out, "jetbrains:DEFAULT_STRING#FOREGROUND")).toBe("#ffeb3b");
  expect(lookupSource(out, "jetbrains:DEFAULT_STRING#FOREGROUND")).toBe(p.colors.yellow.hex);
  expect(lookupSource(ORIGINAL_XML, "jetbrains:DEFAULT_STRING#FOREGROUND")).toBe("#e5e500");
  // Exactly one fixture address changes: the fixture's e5e500 count drops by one. Other e5e500 addresses the fixture owns
  // (for example PY.STRING.U) are not palette roles and stay as the fixture has them.
  const count = (s: string) => s.split('value="e5e500"').length - 1;
  expect(count(out)).toBe(count(ORIGINAL_XML) - 1);
});

test("the regenerated scheme keeps the original shape: the same number of colour values, over 150", async () => {
  const out = renderJetBrains(await loadPalette());
  expect(allColorValues(out).length).toBe(allColorValues(ORIGINAL_XML).length);
  expect(allColorValues(ORIGINAL_XML).length).toBeGreaterThan(150);
});

test("rendering is idempotent: re-rendering the output of a render changes nothing", async () => {
  const p = await loadPalette();
  const once = renderJetBrains(p);
  expect(renderJetBrains(p, once)).toBe(once);
});

test("control: changing one token changes only that colour (and restores stripped zeros correctly)", async () => {
  const p = await loadPalette();
  const baseline = renderJetBrains(p);
  p.colors.blue.hex = "#0a0b0c";
  const out = renderJetBrains(p);
  expect(lookupSource(out, p.colors.blue.source)).toBe("#0a0b0c");
  expect(out).toContain('value="a0b0c"');
  const a = allColorValues(baseline);
  const b = allColorValues(out);
  const changed = a.filter((v, i) => v !== b[i]);
  expect(changed).toEqual(["#00b0ff"]);
});

test("two tokens that share a source must agree", async () => {
  const p = await loadPalette();
  // border writes INDENT_GUIDE through the legacy table; ansi.black now claims the same address with another value.
  p.ansi.black = { hex: "#010101", source: "jetbrains:colors#INDENT_GUIDE" };
  expect(() => renderJetBrains(p)).toThrow(/disagrees/);
});
