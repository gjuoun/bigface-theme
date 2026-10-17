import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { loadPalette } from "./palette.ts";
import { targets } from "./targets.ts";

/** Write every target's files under `outDir/<id>/`. Returns the relative paths written. */
export async function buildThemes(outDir: string): Promise<string[]> {
  const palette = await loadPalette();
  const written: string[] = [];
  for (const t of targets) {
    await rm(join(outDir, t.id), { recursive: true, force: true });
    for (const [rel, contents] of Object.entries(t.files(palette))) {
      const path = join(outDir, t.id, rel);
      await mkdir(dirname(path), { recursive: true });
      await Bun.write(path, contents);
      written.push(join(t.id, rel));
    }
  }
  return written;
}

/**
 * Obsidian's community directory reads manifest.json and theme.css from the REPOSITORY ROOT, so the
 * generated Obsidian files are mirrored there (and the committed copies are checked for drift).
 */
export const OBSIDIAN_ROOT_FILES = ["manifest.json", "theme.css"] as const;

export async function mirrorObsidianToRoot(themesDir: string, rootDir: string): Promise<void> {
  for (const f of OBSIDIAN_ROOT_FILES) {
    await copyFile(join(themesDir, "obsidian", "Bigface", f), join(rootDir, f));
  }
}

if (import.meta.main) {
  const out = process.argv[2] ?? new URL("../themes", import.meta.url).pathname;
  const files = await buildThemes(out);
  if (process.argv[2] === undefined) {
    await mirrorObsidianToRoot(out, new URL("..", import.meta.url).pathname);
  }
  console.log(`wrote ${files.length} files for ${targets.length} targets → ${out}`);
  for (const f of files) console.log(`  ${f}`);
}
