import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { buildThemes } from "./build.ts";
import { targets } from "./targets.ts";

const EXPECTED = [
  "pi",
  "ghostty",
  "herdr",
  "vscode",
  "zed",
  "jetbrains",
  "zellij",
  "starship",
  "tmux",
  "vim",
  "xcode",
  "micro",
  "obsidian",
  "slack",
  "raycast",
];
/** These formats take 6-digit colours only; the others (VS Code, Zed, Obsidian, Raycast) use alpha on purpose. */
const NO_ALPHA = new Set([
  "pi",
  "ghostty",
  "herdr",
  "jetbrains",
  "zellij",
  "starship",
  "tmux",
  "vim",
  "xcode",
  "micro",
  "slack",
]);

async function walk(root: string, dir = root): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(root, p)));
    else out.push(relative(root, p));
  }
  return out;
}

const root = new URL("../themes", import.meta.url).pathname;
const tmp = await mkdtemp(join(tmpdir(), "bf-build-"));
const written = await buildThemes(tmp);

test("the registry lists all 15 targets, in order, with unique ids", () => {
  expect(targets.map((t) => t.id)).toEqual(EXPECTED);
});

test("every target wrote at least one file", () => {
  for (const t of targets) {
    expect(
      written.some((f) => f.startsWith(`${t.id}/`)),
      t.id,
    ).toBe(true);
  }
});

test("committed themes/ equals a fresh build (run `bun run themes` after editing the palette)", async () => {
  const committed = (await walk(root)).sort();
  expect(committed).toEqual([...written].sort());
  for (const f of written) {
    const [a, b] = [await Bun.file(join(root, f)).text(), await Bun.file(join(tmp, f)).text()];
    expect(a === b, `${f} is out of date`).toBe(true);
  }
});

test("formats that don't support alpha contain no 8-digit hex", async () => {
  for (const f of written) {
    const id = f.split("/")[0] as string;
    if (!NO_ALPHA.has(id)) continue;
    const text = await Bun.file(join(tmp, f)).text();
    expect(text.match(/#[0-9a-fA-F]{8}\b/g), f).toBeNull();
  }
});
