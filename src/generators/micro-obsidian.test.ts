import { describe, expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { micro } from "./micro.ts";
import { obsidian } from "./obsidian.ts";

const p = await loadPalette();

describe("micro (format: zyedidia/micro runtime/help/colors.md)", () => {
  const text = (micro.files(p) as Record<string, string>)["bigface.micro"] as string;
  const lines = text.split("\n").filter((l) => l && !l.startsWith("#"));
  const COLOUR = "(?:#[0-9a-f]{6})";
  const line = new RegExp(
    `^color-link [A-Za-z.\\-]+ "(?:(?:bold|italic|underline|reverse) )*${COLOUR}?(?:,${COLOUR})?"$`,
  );

  test('every directive is `color-link <group> "[attrs ]fg[,bg]"` with 6-digit hex', () => {
    expect(lines.length).toBeGreaterThan(30);
    expect(lines.filter((l) => !line.test(l))).toEqual([]);
  });
  test("has the documented core groups", () => {
    const groups = new Set(lines.map((l) => l.split(" ")[1]));
    for (const g of [
      "default",
      "comment",
      "identifier",
      "constant",
      "constant.string",
      "constant.number",
      "statement",
      "type",
      "symbol.operator",
      "preproc",
      "special",
      "error",
      "todo",
      "selection",
      "statusline",
      "cursor-line",
      "line-number",
      "current-line-number",
      "gutter-error",
      "hlsearch",
    ]) {
      expect(groups.has(g), g).toBe(true);
    }
  });
  test("uses the palette", () => {
    expect(text).toContain('color-link default "#d9d9d4,#252925"');
    expect(text).toContain('color-link statement "#00b0ff,#252925"');
  });
});

describe("Obsidian (format: docs.obsidian.md Build a theme + Manifest)", () => {
  const files = obsidian.files(p) as Record<string, string>;
  const manifest = JSON.parse(files["Bigface/manifest.json"] as string);
  const css = files["Bigface/theme.css"] as string;

  test("manifest has required fields; name equals the folder name; no 'Theme'/'Obsidian' in it", () => {
    for (const k of ["name", "version", "minAppVersion", "author"])
      expect(manifest[k]).toBeTruthy();
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Object.keys(files).every((f) => f.startsWith(`${manifest.name}/`))).toBe(true);
    expect(manifest.name).not.toMatch(/theme|obsidian/i);
    expect(manifest.name).toMatch(/^[A-Za-z0-9 ()+-]+$/);
  });
  test("css has a balanced .theme-dark block defining the essential variables", () => {
    expect(css.match(/{/g)?.length).toBe(css.match(/}/g)?.length);
    expect(css).toContain(".theme-dark {");
    for (const v of [
      "--background-primary",
      "--background-secondary",
      "--text-normal",
      "--text-accent",
      "--text-selection",
      "--caret-color",
      "--code-comment",
      "--code-function",
      "--code-keyword",
      "--code-operator",
      "--code-property",
      "--code-punctuation",
      "--code-string",
      "--code-tag",
      "--code-value",
      "--code-important",
      "--code-normal",
      "--code-background",
    ]) {
      expect(css, v).toContain(`${v}:`);
    }
    expect(css).toContain("--background-primary: #252925;");
    expect(css.match(/: (#[0-9a-f]{6}|#[0-9a-f]{8});/g)?.length).toBe(
      css.match(/^\s+--/gm)?.length,
    );
  });
});
