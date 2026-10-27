import { expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { targets } from "../targets.ts";

// The ANSI pairs the palette rules identical, and that every port writes them identically (JW-304 yellow-single, 2026-10-27).
// Yellow: both slots are the one yellow. Red, magenta and white pair only in the dark palette: in the light palette white is
// the ink and bright white is the canvas (light.ts, LIGHT_ANSI_TARGET), a ruled difference, pinned below.
const YELLOW = "#ffeb3b";
const out = async (id: string, p: Awaited<ReturnType<typeof loadPalette>>) => {
  const t = targets.find((x) => x.id === id);
  if (!t) throw new Error("no target " + id);
  return Object.values(t.files(p)).join("\n");
};

test("the palette: yellow, red, magenta and white pair identically in the dark palette", async () => {
  const p = await loadPalette();
  for (const [a, b] of [["yellow", "brightYellow"], ["red", "brightRed"], ["magenta", "brightMagenta"], ["white", "brightWhite"]] as const) {
    expect(p.ansi[a].hex, a + "/" + b).toBe(p.ansi[b].hex);
  }
  expect(p.ansi.yellow.hex).toBe(YELLOW);
});

test("the light palette: yellow and red pair, and white stays the ruled difference (ink vs canvas)", async () => {
  const light = JSON.parse(await Bun.file(new URL("../../palette/bigface-light.json", import.meta.url)).text());
  expect(light.ansi.yellow.hex).toBe(light.ansi.brightYellow.hex);
  expect(light.ansi.red.hex).toBe(light.ansi.brightRed.hex);
  expect(light.ansi.white.hex).toBe(light.colors.fg.hex);
  expect(light.ansi.brightWhite.hex).toBe(light.colors.bg.hex);
});

test("every port writes both yellow ANSI slots as #ffeb3b", async () => {
  const p = await loadPalette();
  // ghostty: palette 3 (yellow) and 11 (bright yellow)
  const ghostty = await out("ghostty", p);
  expect(ghostty).toMatch(/palette = 3=#ffeb3b/);
  expect(ghostty).toMatch(/palette = 11=#ffeb3b/);
  // zed: terminal.ansi.yellow and terminal.ansi.bright_yellow
  const zed = await out("zed", p);
  expect(zed).toContain('"terminal.ansi.yellow": "' + YELLOW + '"');
  expect(zed).toContain('"terminal.ansi.bright_yellow": "' + YELLOW + '"');
  // vs code: terminal.ansiYellow and terminal.ansiBrightYellow
  const vscode = await out("vscode", p);
  expect(vscode).toContain('"terminal.ansiYellow": "' + YELLOW + '"');
  expect(vscode).toContain('"terminal.ansiBrightYellow": "' + YELLOW + '"');
  // vim: g:terminal_ansi_colors indices 3 and 11
  const vim = await out("vim", p);
  const list = /g:terminal_ansi_colors = \[([^\]]+)\]/.exec(vim)?.[1]?.split(",").map((s) => s.trim().replace(/'/g, "")) ?? [];
  expect(list[3]).toBe(YELLOW);
  expect(list[11]).toBe(YELLOW);
  // starship: yellow and bright-yellow
  const starship = await out("starship", p);
  expect(starship).toContain('yellow         = "' + YELLOW + '"');
  expect(starship).toContain('bright-yellow  = "' + YELLOW + '"');
});

test("dark ANSI pairs hold in ghostty too: red 1/9, magenta 5/13, white 7/15", async () => {
  const p = await loadPalette();
  const g = await out("ghostty", p);
  const hex = (n: number) => new RegExp("palette = " + n + "=(#[0-9a-f]{6})").exec(g)?.[1];
  expect(hex(1)).toBe(hex(9));
  expect(hex(5)).toBe(hex(13));
  expect(hex(7)).toBe(hex(15));
});
