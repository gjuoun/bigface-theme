import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { loadPalette } from "../palette.ts";
import { vim } from "./vim.ts";

const have = Bun.which("vim") !== null;
const files = vim.files(await loadPalette()) as Record<string, string>;

async function setup(contents: string) {
  const dir = await mkdtemp(join(tmpdir(), "bf-vim-"));
  await mkdir(join(dir, "colors"));
  await writeFile(join(dir, "colors/bigface.vim"), contents);
  return dir;
}

async function hlNormal(dir: string): Promise<string> {
  const out = join(dir, "hl.txt");
  await $`vim -u NONE -es -c ${`set rtp+=${dir}`} -c ${"colorscheme bigface"} -c ${`redir! > ${out}`} -c ${"silent hi Normal"} -c ${"redir END"} -c ${"qa!"}`
    .quiet()
    .nothrow();
  return (await Bun.file(out).exists()) ? await Bun.file(out).text() : "";
}

test("defines core highlight groups with palette colours", () => {
  const v = files["colors/bigface.vim"] as string;
  expect(v).toContain("hi Normal guifg=#d9d9d4 guibg=#252925");
  expect(v).toContain("hi Statement guifg=#00b0ff");
  expect(v).toContain("hi String guifg=#e5e500");
  expect(v).toContain("hi Function guifg=#c6ff00");
  expect(v).toContain("g:terminal_ansi_colors");
});

test.skipIf(!have)("vim loads the colorscheme and Normal gets the palette background", async () => {
  const text = await hlNormal(await setup(files["colors/bigface.vim"] as string));
  expect(text).toContain("guifg=#d9d9d4");
  expect(text).toContain("guibg=#252925");
});

test.skipIf(!have)("control: a scheme without Normal leaves no bigface colours", async () => {
  const text = await hlNormal(await setup('let g:colors_name = "bigface"\n'));
  expect(text).not.toContain("guibg=#252925");
});
