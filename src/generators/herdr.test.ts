import { expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { loadPalette } from "../palette.ts";
import { HERDR_KEYS, herdr } from "./herdr.ts";

const haveHerdr = Bun.which("herdr") !== null;
const snippet = async () =>
  (herdr.files(await loadPalette()) as Record<string, string>)["theme.toml"] as string;

test("defines every key with a 6-digit hex", async () => {
  const t = await snippet();
  for (const k of HERDR_KEYS) expect(t).toMatch(new RegExp(`^${k}\\s+= "#[0-9a-f]{6}"`, "m"));
  expect(t).toContain('panel_bg      = "#252925"');
});

async function check(toml: string) {
  const dir = await mkdtemp(join(tmpdir(), "bf-herdr-"));
  const file = join(dir, "config.toml");
  await writeFile(file, toml);
  const r = await $`herdr config check`
    .env({ ...process.env, HERDR_CONFIG_PATH: file })
    .quiet()
    .nothrow();
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

test.skipIf(!haveHerdr)("herdr config check accepts base theme + generated block", async () => {
  const r = await check(`[theme]\nname = "one-dark"\n\n${await snippet()}`);
  expect(r.out).toContain("config: ok");
  expect(r.code).toBe(0);
});

test.skipIf(!haveHerdr)("control: herdr config check flags an unknown key", async () => {
  const r = await check(`[theme]\nname = "one-dark"\n\n${await snippet()}bogus_key = "#fff"\n`);
  expect(r.code).not.toBe(0);
  expect(r.out).toContain("unknown config key");
});
