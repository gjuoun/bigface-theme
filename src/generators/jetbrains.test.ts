import { expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { allColorValues, lookupSource } from "../scheme-xml.ts";
import { LEGACY_ADDRESSES, ORIGINAL_XML, renderJetBrains } from "./jetbrains.ts";

// Plan 2026-10-25, Step 9. The scheme follows the palette: its JetBrains-sourced colours and the legacy addresses of
// the collapsed neutrals (the transition shim in jetbrains.ts) read back exactly as the palette has them. The
// round trip against the ORIGINAL scheme is no longer byte-identical, because the derived neutrals moved on purpose.

/** Every colour field of the fixture as a jetbrains source string: attribute options, then the <colors> block. */
function fixtureSources(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(
    /<option name="([^"]+)"(?: baseAttributes="[^"]*")?>\s*<value>([\s\S]*?)<\/value>/g,
  )) {
    for (const f of (m[2] as string).matchAll(
      /<option name="([A-Z_]+)" value="([0-9a-fA-F]{1,6})"/g,
    ))
      out.push(`jetbrains:${m[1]}#${f[1]}`);
  }
  for (const c of xml.matchAll(/<colors>([\s\S]*?)<\/colors>/g)) {
    for (const f of (c[1] as string).matchAll(
      /<option name="([A-Z_]+)" value="([0-9a-fA-F]{1,6})"/g,
    ))
      out.push(`jetbrains:colors#${f[1]}`);
  }
  return out;
}

test("every JetBrains-sourced colour and every legacy address reads back as the palette's value", async () => {
  const p = await loadPalette();
  const out = renderJetBrains(p);
  for (const [name, c] of Object.entries(p.colors)) {
    if (c.source.startsWith("jetbrains:")) expect(lookupSource(out, c.source), name).toBe(c.hex);
  }
  for (const [source, role] of LEGACY_ADDRESSES)
    expect(lookupSource(out, source), source + " <- " + role).toBe(p.colors[role].hex);
});

test("the fixture is untouched: every address the table does not own reads back as the 2018 scheme has it", async () => {
  const p = await loadPalette();
  const out = renderJetBrains(p);
  const owned = new Set([
    ...LEGACY_ADDRESSES.map(([s]) => s),
    ...Object.values(p.colors).map((c) => c.source),
    ...Object.values(p.ansi).map((c) => c.source),
  ]);
  const sources = fixtureSources(ORIGINAL_XML);
  expect(sources.length).toBeGreaterThan(150);
  const changed = sources.filter((s) => lookupSource(out, s) !== lookupSource(ORIGINAL_XML, s));
  for (const s of changed)
    expect(owned.has(s), s + " changed but the table does not own it").toBe(true);
});

test("the yellow family: every row writes the single palette yellow, and no yellow-hued fixture address is left off-palette", async () => {
  const p = await loadPalette();
  const out = renderJetBrains(p);
  const yellowRows = LEGACY_ADDRESSES.filter(([, role]) => role === "yellow").map(([s]) => s);
  expect(yellowRows.length).toBe(13);
  for (const s of yellowRows) expect(lookupSource(out, s), s).toBe("#ffeb3b");
  for (const old of ["#e5e500", "#ccff90", "#ffe792", "#eeff41", "#f7f700", "#808000", "#ebc700"]) {
    const left = fixtureSources(out).filter((s) => lookupSource(out, s) === old);
    expect(left, old).toEqual([]);
  }
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
