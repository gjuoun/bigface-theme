import { expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { loadPalette } from "../palette.ts";
import { xcode, xcodeColor } from "./xcode.ts";

const have = Bun.which("plutil") !== null;
const plist = async () =>
  (xcode.files(await loadPalette()) as Record<string, string>)["Bigface.xccolortheme"] as string;
const REF =
  "/Applications/Xcode.app/Contents/SharedFrameworks/DVTUserInterfaceKit.framework/Versions/A/Resources/FontAndColorThemes/Default (Dark).xccolortheme";

test("xcodeColor converts #rrggbb to r g b a floats", () => {
  expect(xcodeColor("#ffffff")).toBe("1 1 1 1");
  expect(xcodeColor("#000000")).toBe("0 0 0 1");
  expect(xcodeColor("#252925")).toBe("0.145098 0.160784 0.145098 1");
});

test.skipIf(!have)("plutil -lint accepts the theme", async () => {
  const f = join(await mkdtemp(join(tmpdir(), "bf-xc-")), "Bigface.xccolortheme");
  await writeFile(f, await plist());
  const r = await $`plutil -lint ${f}`.quiet().nothrow();
  expect(r.exitCode).toBe(0);
  expect(r.stdout.toString()).toContain("OK");
});

test.skipIf(!have)("control: plutil -lint rejects a broken plist", async () => {
  const f = join(await mkdtemp(join(tmpdir(), "bf-xc-")), "bad.xccolortheme");
  await writeFile(f, "<plist><dict><key>x</key></plist>");
  expect((await $`plutil -lint ${f}`.quiet().nothrow()).exitCode).not.toBe(0);
});

test.skipIf(!(await Bun.file(REF).exists()))(
  "has every colour key Xcode's own Default (Dark) theme uses",
  async () => {
    const keys = async (path: string) => {
      const json = await $`plutil -convert json -o - ${path}`.quiet().text();
      const o = JSON.parse(json) as Record<string, unknown>;
      return {
        top: Object.keys(o).filter((k) => k.endsWith("Color") || k.endsWith("Background")),
        syntax: Object.keys(o.DVTSourceTextSyntaxColors as object),
        fonts: Object.keys(o.DVTSourceTextSyntaxFonts as object),
      };
    };
    const f = join(await mkdtemp(join(tmpdir(), "bf-xc-")), "Bigface.xccolortheme");
    await writeFile(f, await plist());
    const ours = await keys(f);
    const ref = await keys(REF);
    expect(ref.syntax.filter((k) => !ours.syntax.includes(k))).toEqual([]);
    expect(ref.fonts.filter((k) => !ours.fonts.includes(k))).toEqual([]);
    expect(ref.top.filter((k) => !ours.top.includes(k))).toEqual([]);
  },
);

test("uses palette colours", async () => {
  const t = await plist();
  expect(t).toContain("<string>0.145098 0.160784 0.145098 1</string>"); // bg
});
