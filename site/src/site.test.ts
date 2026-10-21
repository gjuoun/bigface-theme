import { beforeAll, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { targets } from "./data/targets.ts";

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

test("the site only ships colours that exist in the palette", () => {
  // Chrome included: the site uses the theme's own surfaces. Gradients interpolate between palette
  // stops, and translucent steps are palette colours with alpha, so no other hex may appear.
  const palette = JSON.parse(readFileSync(join(repo, "palette/bigface.json"), "utf8")) as {
    colors: Record<string, { hex: string }>;
    ansi: Record<string, { hex: string }>;
  };
  const known = new Set(
    [...Object.values(palette.colors), ...Object.values(palette.ansi)].map((c) =>
      c.hex.toLowerCase(),
    ),
  );
  const triplets = new Set(
    [...known].map((h) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)).join(",")),
  );
  const scan = (file: string) => {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
      expect(known.has(m[0].toLowerCase()), `${file}: ${m[0]}`).toBe(true);
    }
    // rgb()/rgba() triples are palette colours too — a stray rgba(5,13,27,…) once slipped past.
    for (const m of text.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g)) {
      expect(triplets.has(`${m[1]},${m[2]},${m[3]}`), `${file}: rgb(${m[1]},${m[2]},${m[3]})`).toBe(
        true,
      );
    }
  };
  scan(join(dist, "index.html"));
  scan(join(dist, "palette/index.html"));
  scan(join(dist, "apps/jetbrains/index.html"));
  for (const css of ["Base", "index"]) {
    const files = readdirSync(join(dist, "_astro")).filter(
      (f) => f.startsWith(css) && f.endsWith(".css"),
    );
    for (const f of files) scan(join(dist, "_astro", f));
  }
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
