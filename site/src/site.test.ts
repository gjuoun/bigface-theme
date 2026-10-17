import { beforeAll, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import { targets } from "./data/targets.ts";

const siteDir = join(import.meta.dir, "..");
const repo = join(siteDir, "..");
const dist = join(siteDir, "dist");
const BASE = "/bigface-theme";
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
  expect(pal).toContain("derived");
});

test("the VS Code .vsix is packaged into the site", () => {
  expect(existsSync(join(dist, "downloads/bigface-theme-0.1.0.vsix"))).toBe(true);
});

test("internal links stay under the Pages base path", () => {
  for (const rel of ["", "palette", "apps/pi"]) {
    const html = page(rel);
    for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
      expect((m[1] as string).startsWith(`${BASE}/`), m[1]).toBe(true);
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
