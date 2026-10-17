import { expect, test } from "bun:test";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { buildThemes, OBSIDIAN_ROOT_FILES } from "./build.ts";
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
];
/** These formats take 6-digit colours only; the others (VS Code, Zed, Obsidian) use alpha on purpose. */
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

test("the registry lists all 14 targets, in order, with unique ids", () => {
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

test("the repo root carries the Obsidian theme exactly as generated (the community directory reads the root)", async () => {
  const repo = join(root, "..");
  for (const f of OBSIDIAN_ROOT_FILES) {
    const rootCopy = await Bun.file(join(repo, f)).text();
    const fresh = await Bun.file(join(tmp, "obsidian/Bigface", f)).text();
    expect(rootCopy === fresh, `${f} at the repo root is out of date (run bun run themes)`).toBe(
      true,
    );
  }
  const manifest = JSON.parse(await Bun.file(join(repo, "manifest.json")).text());
  expect(manifest.name).toBe("Bigface");
  expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
});

test("repo root has what Obsidian's directory requires: README, LICENSE and a 512x288 screenshot", async () => {
  const repo = join(root, "..");
  for (const f of ["README.md", "LICENSE", "screenshot.png"]) {
    expect(await Bun.file(join(repo, f)).exists(), f).toBe(true);
  }
  const png = Buffer.from(await Bun.file(join(repo, "screenshot.png")).arrayBuffer());
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([512, 288]);
});
