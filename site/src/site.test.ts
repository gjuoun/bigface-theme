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
