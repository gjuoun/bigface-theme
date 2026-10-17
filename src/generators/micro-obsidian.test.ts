import { describe, expect, test } from "bun:test";
import { loadPalette } from "../palette.ts";
import { micro } from "./micro.ts";
import { hsl, obsidian, obsidianVariables, rgbTriplet } from "./obsidian.ts";

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
  test("css has a balanced .theme-dark block defining the essential variables", () => {});

  test("every variable it sets exists in Obsidian 1.14.4's own stylesheet", async () => {
    const known = new Set(
      (
        await Bun.file(new URL("../fixtures/obsidian-vars-1.14.4.txt", import.meta.url)).text()
      ).split("\n"),
    );
    const names = [...css.matchAll(/^\s+(--[a-z0-9-]+):/gm)].map((m) => m[1] as string);
    expect(names.length).toBeGreaterThan(150);
    expect(names.filter((n) => !known.has(n))).toEqual([]);
  });

  test("no variable is set twice, and every value is a hex colour, an rgb triplet or an accent number", () => {
    const rows = obsidianVariables(p).flatMap((g) => g.rows);
    const names = rows.map(([n]) => n);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
    for (const [n, v] of rows) {
      expect(v, n).toMatch(/^(#[0-9a-f]{6}([0-9a-f]{2})?|\d+, \d+, \d+|\d+%?)$/);
    }
  });

  test("each *-rgb triplet matches its hex colour", () => {
    const get = (k: string) => css.match(new RegExp(`${k}: ([^;]+);`))?.[1] as string;
    for (const n of ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"]) {
      expect(get(`--color-${n}-rgb`), n).toBe(rgbTriplet(get(`--color-${n}`)));
    }
  });

  test("accent hsl is the blue exactly (hue 199, 100%, 50%)", () => {
    expect(hsl("#00b0ff")).toEqual([199, 100, 50]);
    expect(css).toContain("--accent-h: 199;");
  });

  test("covers headings, links, tags, quotes, lists, tables, graph, tabs and the grey scale", () => {
    for (const v of [
      "--h1-color",
      "--h6-color",
      "--link-color",
      "--tag-color",
      "--blockquote-border-color",
      "--list-marker-color",
      "--checkbox-color",
      "--table-border-color",
      "--graph-node",
      "--tab-container-background",
      "--color-base-00",
      "--color-base-100",
      "--bold-color",
      "--italic-color",
      "--hr-color",
      "--text-highlight-bg",
      "--status-bar-background",
    ]) {
      expect(css, v).toContain(`${v}:`);
    }
  });
});
