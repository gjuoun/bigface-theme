import { expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { loadPalette } from "../palette.ts";
import { ghostty } from "./ghostty.ts";

const GHOSTTY = "/Applications/Ghostty.app/Contents/MacOS/ghostty";
const haveGhostty = await Bun.file(GHOSTTY).exists();

const theme = async () =>
  (ghostty.files(await loadPalette()) as Record<string, string>).Bigface as string;

test("emits 16 palette entries, background, foreground and selection", async () => {
  const t = await theme();
  expect(t.match(/^palette = \d+=#[0-9a-f]{6}$/gm)?.length).toBe(16);
  expect(t).toContain("background = #252925");
  expect(t).toContain("foreground = #d9d9d4");
  // ANSI slots alias the scheme's own colours, so slot 1 is whatever `red` borrows.
  const p = await loadPalette();
  expect(t).toContain(`palette = 1=${p.ansi.red.hex}`);
});

async function validate(contents: string): Promise<number> {
  const dir = await mkdtemp(join(tmpdir(), "bf-ghostty-"));
  const themeFile = join(dir, "Bigface");
  const conf = join(dir, "g.conf");
  await writeFile(themeFile, contents);
  await writeFile(conf, `theme = ${themeFile}\n`);
  return (await $`${GHOSTTY} +validate-config --config-file=${conf}`.quiet().nothrow()).exitCode;
}

test.skipIf(!haveGhostty)("Ghostty's own validator accepts the theme", async () => {
  expect(await validate(await theme())).toBe(0);
});

test.skipIf(!haveGhostty)("control: validator rejects a bad colour", async () => {
  expect(await validate("background = #zzzzzz\n")).not.toBe(0);
});
