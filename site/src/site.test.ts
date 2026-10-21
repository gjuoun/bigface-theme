import { beforeAll, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { findForeignInCss, findForeignInHtml, paletteHexes } from "./color-guard.ts";
import { contrastRatio, inkOn, palette } from "./data/palette.ts";
import { targets } from "./data/targets.ts";
import { findInklessBrightPlates } from "./ink-guard.ts";

const siteDir = join(import.meta.dir, "..");
const repo = join(siteDir, "..");
const dist = join(siteDir, "dist");
const BASE = "";
const page = (rel: string) => readFileSync(join(dist, rel, "index.html"), "utf8");

beforeAll(async () => {
  const r = await $`bun run site:build`.cwd(repo).quiet().nothrow();
  if (r.exitCode !== 0) throw new Error(`site build failed:\n${r.stderr.toString()}`);
}, 120_000);

test("one page per target plus home and palette", () => {
  expect(existsSync(join(dist, "index.html"))).toBe(true);
  expect(existsSync(join(dist, "palette/index.html"))).toBe(true);
  for (const t of targets)
    expect(existsSync(join(dist, "apps", t.id, "index.html")), t.id).toBe(true);
});

test("every app page has install steps, a code block, and download links that point at real files", () => {
  for (const t of targets) {
    const html = page(`apps/${t.id}`);
    expect(html, t.id).toMatch(/<h2[^>]*>Install<\/h2>/);
    expect(html, t.id).toContain("<pre");
    const hrefs = [...html.matchAll(/href="([^"]+)" download/g)].map((m) => m[1] as string);
    expect(hrefs.length, t.id).toBeGreaterThanOrEqual(t.files.length);
    for (const h of hrefs) {
      expect(h.startsWith(`${BASE}/`), h).toBe(true);
      expect(existsSync(join(dist, h.slice(BASE.length))), h).toBe(true);
    }
  }
});

test("each page states how far it was checked", () => {
  for (const t of targets) {
    const html = page(`apps/${t.id}`);
    expect(html).toContain("What was checked");
    expect(html).toContain(
      {
        tool: "Checked with the tool",
        schema: "Checked against its schema",
        format: "Format-checked only",
      }[t.check.level],
    );
  }
});

test("pages use the palette: background, a syntax colour, and the original JetBrains source labels", () => {
  expect(page("")).toContain("#252925");
  const pal = page("palette");
  expect(pal).toContain("#00b0ff");
  expect(pal).toContain("DEFAULT_KEYWORD#FOREGROUND");
  // No colour may be described as blended/invented: every token is a scheme value.
  expect(pal).not.toContain("derived");
  expect(pal).toContain("byte-for-byte");
});

test("the VS Code .vsix is packaged into the site", () => {
  expect(existsSync(join(dist, "downloads/bigface-theme-0.1.0.vsix"))).toBe(true);
});

test("internal links are root-absolute and name no project path", () => {
  for (const rel of ["", "palette", "apps/pi"]) {
    const html = page(rel);
    for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
      const href = m[1] as string;
      expect(href.startsWith("/"), href).toBe(true);
      expect(href.startsWith("/bigface-theme"), href).toBe(false);
      expect(href.startsWith("//"), href).toBe(false);
    }
  }
});

test("every app page shows its one-line install command, and install.sh is published", () => {
  expect(existsSync(join(dist, "install.sh"))).toBe(true);
  const script = readFileSync(join(dist, "install.sh"), "utf8");
  expect(script.startsWith("#!/bin/sh")).toBe(true);
  for (const t of targets) {
    const html = page(`apps/${t.id}`);
    expect(html, t.id).toContain(`install.sh | sh -s -- ${t.id}`);
    expect(script, t.id).toContain(`install_${t.id}()`);
  }
  for (const t of targets)
    expect(page(`apps/${t.id}`), t.id).toContain(`install.sh | sh -s -- --uninstall ${t.id}`);
  const home = page("");
  expect(home).toContain("install.sh | sh</code>");
  expect(home).toContain("install.sh | sh -s -- all");
  expect(home).toContain("install.sh | sh -s -- --uninstall all");
  expect(script).toContain("uninstall_ghostty()");
});

test("the Obsidian page shows a real screenshot that exists and matches its declared size", () => {
  const html = page("apps/obsidian");
  const m = html.match(/<img[^>]*src="([^"]+obsidian-preview\.png)"[^>]*>/);
  expect(m, "img tag").not.toBeNull();
  const src = (m as RegExpMatchArray)[1] as string;
  expect(src.startsWith(`${BASE}/img/`)).toBe(true);
  const file = join(dist, src.slice(BASE.length));
  expect(existsSync(file)).toBe(true);
  const buf = readFileSync(file);
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  const [w, h] = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  expect(html).toContain(`width="${w}"`);
  expect(html).toContain(`height="${h}"`);
  expect(w).toBeGreaterThanOrEqual(1200);
  expect(buf.length).toBeLessThan(400 * 1024);
  expect(html).toMatch(/alt="Obsidian in reading view/);
});

test("every swatch prints an ink that actually contrasts on it", () => {
  // The label on a colour chip is chosen from the palette's own fg/bg, and the ratio it prints
  // must be readable text (WCAG AA for body copy) — lime with cream text was 1.2:1 before this.
  const check = (label: string, hexValue: string, floor: number) => {
    const { ratio } = inkOn(hexValue);
    // The badge must never overstate: it prints the best of the palette's two inks.
    const best = Math.max(
      contrastRatio(palette.colors.fg.hex, hexValue),
      contrastRatio(palette.colors.bg.hex, hexValue),
    );
    expect(ratio, `${label} ${hexValue} is not the best available ink`).toBeCloseTo(
      Math.round(best * 10) / 10,
      1,
    );
    expect(ratio, `${label} ${hexValue}`).toBeGreaterThanOrEqual(floor);
  };
  // Accents are the eye-candy: AA body text on every one of them.
  for (const name of [
    "blue",
    "lightBlue",
    "paleBlue",
    "cyan",
    "green",
    "lime",
    "yellow",
    "brightYellow",
    "burntOrange",
    "purple",
  ]) {
    check(name, palette.colors[name].hex, 4.5);
  }
  // Neutrals only have to be legible, and fgDim genuinely tops out at 3.7:1 against both inks.
  for (const [name, color] of Object.entries(palette.colors)) check(name, color.hex, 3);
  for (const [name, color] of Object.entries(palette.ansi)) check(`ansi.${name}`, color.hex, 3);
});

test("anything painted with a bright plate writes dark ink on it", () => {
  // Two bugs of this shape shipped: cream on lime swatches (1.2:1) and cream on the selected
  // filter chip (1.7:1). Rules that fill with an accent or the pale blues must use the one ink
  // token, so a new bright control cannot quietly inherit the page's cream foreground.
  const css = readdirSync(join(repo, "site/dist/_astro"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(repo, "site/dist/_astro", f), "utf8"))
    .join("\n");
  const bright = [
    "var(--blue)",
    "var(--light-blue)",
    "var(--pale-blue)",
    "var(--cyan)",
    "var(--lime)",
    "var(--yellow)",
    "var(--bright-yellow)",
  ];
  const blocks = css.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  const offenders: string[] = [];
  for (const block of blocks) {
    const paints = /\.(?:btn|swatch|tab|filter|chip|pill|badge)/.test(block);
    // only an opaque fill counts: a translucent tint (color-mix) sits on the dark plate, so cream
    // ink on it is the normal case, not a bug
    const decl = block.match(/(?:^|;)\s*background(?:-color)?:[^;]*/)?.[0] ?? "";
    const fill = !decl.includes("color-mix") && bright.some((c) => decl.includes(c));
    if (!paints || !fill) continue;
    if (!/var\(--ink-on-bright\)/.test(block))
      offenders.push(block.slice(0, 90).replace(/\s+/g, " "));
  }
  expect(offenders).toEqual([]);
});

test("no element pairs a bright fill class with anything but the dark ink", () => {
  const offenders: string[] = [];
  for (const f of readdirSync(dist, { recursive: true, encoding: "utf8" }).filter((f) =>
    f.endsWith("index.html"),
  ))
    for (const cls of findInklessBrightPlates(readFileSync(join(dist, f), "utf8")))
      offenders.push(`${f}: ${cls}`);
  expect(offenders).toEqual([]);
});

// Until shadcn is initialised there is no --primary token to pair.
const tailwindCss = join(siteDir, "src/styles/tailwind.css");
test.skipIf(!existsSync(tailwindCss))("the shadcn primary token writes the dark ink", () => {
  const css = readdirSync(join(dist, "_astro"))
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(join(dist, "_astro", f), "utf8"))
    .join("\n");
  expect(css).toMatch(/--primary-foreground:\s*var\(--ink-on-bright\)/);
});

test("the site only ships colours that exist in the palette", () => {
  // Chrome included: the site uses the theme's own surfaces. Gradients interpolate between palette
  // stops, and translucent steps are palette colours with alpha. The scanner (color-guard.ts) knows
  // every CSS colour syntax — hex of any length, rgb(), oklch()/lab()/hsl()…, named colours — because
  // Tailwind/shadcn defaults ship oklch() and short hex that a #rrggbb regex never saw.
  const known = paletteHexes(palette);
  const htmlFiles = readdirSync(dist, { recursive: true, encoding: "utf8" }).filter((f) =>
    f.endsWith("index.html"),
  );
  expect(htmlFiles.length).toBeGreaterThanOrEqual(16);
  const offenders: string[] = [];
  for (const f of htmlFiles)
    for (const bad of findForeignInHtml(readFileSync(join(dist, f), "utf8"), known))
      offenders.push(`${f}: ${bad}`);
  const cssFiles = readdirSync(join(dist, "_astro")).filter((f) => f.endsWith(".css"));
  for (const f of cssFiles) {
    const css = readFileSync(join(dist, "_astro", f), "utf8");
    for (const bad of findForeignInCss(css, known)) offenders.push(`_astro/${f}: ${bad}`);
    // The ring-offset #fff default is only harmless while no ring-offset utility paints it.
    expect(css, f).not.toMatch(/\.ring-offset-/);
  }
  expect(offenders).toEqual([]);
  // And the theme's own background really is the page background.
  expect(page("")).toContain("#252925");
});

test("the brand mark ships as a vector favicon, a touch icon and a 1200x630 social card", () => {
  const svg = readFileSync(join(dist, "favicon.svg"), "utf8");
  expect(svg).toContain("<svg");
  expect(svg).toContain('viewBox="0 0 512 512"');
  expect(svg).toContain("Bigface polar bear mark");

  for (const icon of ["favicon-32.png", "apple-touch-icon.png"]) {
    const buf = readFileSync(join(dist, icon));
    expect(buf.subarray(1, 4).toString(), icon).toBe("PNG");
  }

  const og = readFileSync(join(dist, "img/og.png"));
  expect(og.subarray(1, 4).toString()).toBe("PNG");
  expect(og.readUInt32BE(16)).toBe(1200);
  expect(og.readUInt32BE(20)).toBe(630);

  const home = page("");
  expect(home).toContain('rel="icon"');
  expect(home).toContain("img/bigface-avatar.svg");
  expect(home).toContain('property="og:image"');
  expect(home).toContain("img/og.png");
});
