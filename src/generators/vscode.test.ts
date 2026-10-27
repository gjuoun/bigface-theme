import { expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { vscode } from "./vscode.ts";

const out = async () => vscode.files(await loadPalette());

test("package.json contributes one dark theme pointing at the theme file", async () => {
  const f = await out();
  const pkg = JSON.parse(f["package.json"] as string);
  expect(pkg.contributes.themes).toEqual([
    { label: "Bigface", uiTheme: "vs-dark", path: "./themes/bigface-color-theme.json" },
  ]);
  expect(f["themes/bigface-color-theme.json"]).toBeDefined();
  expect(f.LICENSE).toContain("MIT License");
});

test("theme uses the palette: editor background, keyword, string, ANSI red", async () => {
  const t = JSON.parse((await out())["themes/bigface-color-theme.json"] as string);
  expect(t.colors["editor.background"]).toBe("#252925");
  const pal = await loadPalette();
  expect(t.colors["terminal.ansiRed"]).toBe(pal.ansi.red.hex);
  const scope = (name: string) =>
    t.tokenColors.find((r: { scope: string[] }) => r.scope.includes(name)).settings.foreground;
  expect(scope("keyword")).toBe("#00b0ff");
  expect(scope("string")).toBe("#ffeb3b");
  expect(scope("entity.name.function")).toBe("#c6ff00");
});

test("every colour is #rrggbb or #rrggbbaa", async () => {
  const t = JSON.parse((await out())["themes/bigface-color-theme.json"] as string);
  for (const [k, v] of Object.entries(t.colors))
    expect(v, k).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
});
