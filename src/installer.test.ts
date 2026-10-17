import { beforeAll, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { $ } from "bun";
import { installSpecs, renderInstaller } from "./installer.ts";
import { targets } from "./targets.ts";

const repo = join(import.meta.dir, "..");
const script = join(await mkdtemp(join(tmpdir(), "bf-inst-script-")), "install.sh");
const site = join(await mkdtemp(join(tmpdir(), "bf-inst-site-")));

/** A PATH holding only what the script needs, so a real `vim` or `tmux` on this machine can't be detected. */
const basic = await mkdtemp(join(tmpdir(), "bf-basic-"));
for (const tool of [
  "sh",
  "curl",
  "mkdir",
  "mv",
  "rm",
  "dirname",
  "mktemp",
  "tr",
  "basename",
  "cat",
]) {
  const real = Bun.which(tool);
  if (!real) throw new Error(`need ${tool} to test the installer`);
  await symlink(real, join(basic, tool));
}

beforeAll(async () => {
  await Bun.write(script, renderInstaller());
  // A local copy of the site's static files, laid out exactly as Pages serves them.
  await $`cp -R ${join(repo, "themes")} ${join(site, "themes")}`.quiet();
  await mkdir(join(site, "downloads"));
  await writeFile(join(site, "downloads/bigface-theme-0.1.0.vsix"), "fake-vsix");
});

interface Run {
  code: number;
  out: string;
  home: string;
}

async function run(
  args: string[],
  extraEnv: Record<string, string> = {},
  bin?: string,
): Promise<Run> {
  const home = await mkdtemp(join(tmpdir(), "bf-inst-home-"));
  const apps = join(home, "Applications");
  await mkdir(apps);
  const env = {
    HOME: home,
    PATH: bin ? `${bin}:${basic}` : basic,
    BIGFACE_BASE: `file://${site}`,
    BIGFACE_APPS: apps,
    ...extraEnv,
  };
  const r = await $`sh ${script} ${args}`.env(env).quiet().nothrow();
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString(), home };
}

async function tree(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (e.isFile()) out.push(join(e.parentPath, e.name).slice(dir.length + 1));
  }
  return out.sort();
}

const themeText = (id: string, path: string) => Bun.file(join(repo, "themes", id, path)).text();

describe("installer table", () => {
  test("covers exactly the targets in the registry", () => {
    expect(installSpecs.map((s) => s.id)).toEqual(targets.map((t) => t.id));
  });
  test("every remote file exists in themes/", async () => {
    for (const s of installSpecs) {
      for (const [remote] of s.files) {
        expect(
          await Bun.file(join(repo, "themes", s.id, remote)).exists(),
          `${s.id}/${remote}`,
        ).toBe(true);
      }
    }
  });
  test("the script is valid POSIX sh", async () => {
    expect((await $`sh -n ${script}`.quiet().nothrow()).exitCode).toBe(0);
    if (Bun.which("dash")) expect((await $`dash -n ${script}`.quiet().nothrow()).exitCode).toBe(0);
  });
});

describe("running the script", () => {
  test("--list and no arguments print the apps and write nothing", async () => {
    for (const args of [["--list"], []]) {
      const r = await run(args);
      expect(r.code).toBe(0);
      expect(r.out).toContain("ghostty");
      expect(await tree(r.home)).toEqual([]);
    }
  });

  const placed: [string, string, string][] = [
    ["pi", ".pi/agent/themes/bigface.json", "bigface.json"],
    ["ghostty", ".config/ghostty/themes/Bigface", "Bigface"],
    ["zed", ".config/zed/themes/bigface.json", "themes/bigface.json"],
    ["zellij", ".config/zellij/themes/bigface.kdl", "bigface.kdl"],
    ["tmux", ".config/tmux/bigface.conf", "bigface.conf"],
    ["micro", ".config/micro/colorschemes/bigface.micro", "bigface.micro"],
    [
      "xcode",
      "Library/Developer/Xcode/UserData/FontAndColorThemes/Bigface.xccolortheme",
      "Bigface.xccolortheme",
    ],
    ["herdr", ".config/bigface/herdr/theme.toml", "theme.toml"],
    ["starship", ".config/bigface/starship/palette.toml", "palette.toml"],
    ["jetbrains", ".config/bigface/jetbrains/Bigface.xml", "Bigface.xml"],
  ];
  for (const [id, rel, remote] of placed) {
    test(`${id}: writes ${rel}, byte-identical to themes/${id}/${remote}`, async () => {
      const r = await run([id]);
      expect(r.code, r.out).toBe(0);
      expect(await Bun.file(join(r.home, rel)).text()).toBe(await themeText(id, remote));
      expect(r.out).toContain("->");
      expect(r.out).not.toContain(r.home);
      expect(r.out).toContain("wrote ~/");
    });
  }

  test("vim installs for both vim and neovim", async () => {
    const r = await run(["vim"]);
    const want = await themeText("vim", "colors/bigface.vim");
    expect(await Bun.file(join(r.home, ".vim/colors/bigface.vim")).text()).toBe(want);
    expect(await Bun.file(join(r.home, ".config/nvim/colors/bigface.vim")).text()).toBe(want);
  });

  test("XDG_CONFIG_HOME is respected", async () => {
    const xdg = await mkdtemp(join(tmpdir(), "bf-xdg-"));
    const r = await run(["ghostty"], { XDG_CONFIG_HOME: xdg });
    expect(await Bun.file(join(xdg, "ghostty/themes/Bigface")).exists()).toBe(true);
    expect(await tree(r.home)).toEqual([]);
  });

  test("obsidian needs a vault, then installs into it", async () => {
    const no = await run(["obsidian"]);
    expect(no.code).not.toBe(0);
    expect(no.out).toContain("BIGFACE_VAULT");
    const vault = await mkdtemp(join(tmpdir(), "bf-vault-"));
    const yes = await run(["obsidian"], { BIGFACE_VAULT: vault });
    expect(yes.code, yes.out).toBe(0);
    expect(await Bun.file(join(vault, ".obsidian/themes/Bigface/manifest.json")).text()).toBe(
      await themeText("obsidian", "Bigface/manifest.json"),
    );
  });

  test("slack prints the 8-colour string", async () => {
    const r = await run(["slack"]);
    expect(r.out).toContain((await themeText("slack", "theme.txt")).trim());
  });

  test("raycast hands the link to `open`", async () => {
    const bin = await mkdtemp(join(tmpdir(), "bf-bin-"));
    const log = join(bin, "open.log");
    await writeFile(join(bin, "open"), `#!/bin/sh\necho "$1" > "${log}"\n`);
    await chmod(join(bin, "open"), 0o755);
    const r = await run(["raycast"], {}, bin);
    expect(r.code, r.out).toBe(0);
    expect((await Bun.file(log).text()).trim()).toBe(
      (await themeText("raycast", "theme.url")).trim(),
    );
  });

  test("vscode passes the .vsix to code and cursor", async () => {
    const bin = await mkdtemp(join(tmpdir(), "bf-bin-"));
    const log = join(bin, "calls.log");
    for (const name of ["code", "cursor"]) {
      await writeFile(
        join(bin, name),
        `#!/bin/sh\necho "${name} $1 $(basename "$2")" >> "${log}"\n`,
      );
      await chmod(join(bin, name), 0o755);
    }
    const r = await run(["vscode"], {}, bin);
    expect(r.code, r.out).toBe(0);
    const calls = (await Bun.file(log).text()).trim().split("\n");
    expect(calls).toEqual([
      "code --install-extension bigface-theme.vsix",
      "cursor --install-extension bigface-theme.vsix",
    ]);
  });

  test("vscode without code or cursor fails with a pointer to the .vsix", async () => {
    const r = await run(["vscode"]);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain("Install from VSIX");
  });

  test("--dry-run writes nothing and says what it would do", async () => {
    const r = await run(["--dry-run", "ghostty", "tmux", "vscode"]);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("would write");
    expect(await tree(r.home)).toEqual([]);
  });

  test("an unknown app fails before anything is written", async () => {
    const r = await run(["ghostty", "nope"]);
    expect(r.code).toBe(2);
    expect(r.out).toContain("unknown app: nope");
    expect(await tree(r.home)).toEqual([]);
  });

  test("a failed download leaves no partial file and a non-zero exit", async () => {
    const r = await run(["ghostty"], { BIGFACE_BASE: `file://${site}/missing` });
    expect(r.code).not.toBe(0);
    expect(await tree(r.home)).toEqual([]);
  });

  test("a second run overwrites cleanly", async () => {
    const home = (await run(["tmux"])).home;
    const target = join(home, ".config/tmux/bigface.conf");
    await writeFile(target, "stale");
    const again = await $`sh ${script} tmux`
      .env({ HOME: home, PATH: basic, BIGFACE_BASE: `file://${site}` })
      .quiet()
      .nothrow();
    expect(again.exitCode).toBe(0);
    expect(await Bun.file(target).text()).toBe(await themeText("tmux", "bigface.conf"));
    expect(dirname(target)).toBeTruthy();
  });

  test("`all` installs only the apps it detects", async () => {
    const none = await run(["all"]);
    expect(none.code).toBe(0);
    expect(none.out).toContain("no supported apps detected");
    expect(await tree(none.home)).toEqual([]);

    const home = await mkdtemp(join(tmpdir(), "bf-inst-home-"));
    const apps = join(home, "Applications");
    await mkdir(join(apps, "Ghostty.app"), { recursive: true });
    await mkdir(join(home, ".config/zellij"), { recursive: true });
    const r = await $`sh ${script} all`
      .env({
        HOME: home,
        PATH: basic,
        BIGFACE_BASE: `file://${site}`,
        BIGFACE_APPS: apps,
      })
      .quiet()
      .nothrow();
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(await tree(home)).toEqual([
      ".config/ghostty/themes/Bigface",
      ".config/zellij/themes/bigface.kdl",
    ]);
  });
});
