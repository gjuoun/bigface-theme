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

/** A PATH holding only what the script needs, so a real `vim` or `zellij` on this machine can't be detected. */
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
  "rmdir",
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

/** Run with scripted answers, as if typed at the terminal. */
async function ask(
  answers: string,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
  bin?: string,
) {
  const file = join(await mkdtemp(join(tmpdir(), "bf-answers-")), "answers");
  await writeFile(file, answers);
  return run(args, { BIGFACE_TTY: file, ...extraEnv }, bin);
}

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
    BIGFACE_TTY: "/nonexistent",
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
    ["herdr", ".config/bigface/herdr/theme.toml", "theme.toml"],
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
    const r = await run(["--dry-run", "ghostty", "zed", "vscode"]);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("would write ~/");
    expect(r.out).not.toContain(r.home);
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
    const home = (await run(["ghostty"])).home;
    const target = join(home, ".config/ghostty/themes/Bigface");
    await writeFile(target, "stale");
    const again = await $`sh ${script} ghostty`
      .env({ HOME: home, PATH: basic, BIGFACE_BASE: `file://${site}` })
      .quiet()
      .nothrow();
    expect(again.exitCode).toBe(0);
    expect(await Bun.file(target).text()).toBe(await themeText("ghostty", "Bigface"));
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
    await mkdir(join(home, ".config/zed"), { recursive: true });
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
      ".config/zed/themes/bigface.json",
    ]);
  });

  test("uninstall leaves unrelated files alone and removes only the empty dirs it created", async () => {
    const r = await run(["herdr", "ghostty"]);
    const other = join(r.home, ".config/ghostty/themes/Other");
    await writeFile(other, "mine");
    const un = await $`sh ${script} --uninstall herdr ghostty`
      .env({ HOME: r.home, PATH: basic, BIGFACE_BASE: `file://${site}` })
      .quiet()
      .nothrow();
    expect(un.exitCode, un.stderr.toString()).toBe(0);
    expect(await tree(r.home)).toEqual([".config/ghostty/themes/Other"]);
    expect(await Bun.file(other).text()).toBe("mine");
    expect(await readdir(join(r.home, ".config"))).not.toContain("bigface");
  });
});

describe("uninstall", () => {
  const homeEnv = (home: string, more: Record<string, string> = {}) => ({
    HOME: home,
    PATH: basic,
    BIGFACE_BASE: `file://${site}`,
    BIGFACE_TTY: "/nonexistent",
    ...more,
  });

  test("install then uninstall every file-based app leaves the home empty", async () => {
    const ids = ["pi", "ghostty", "zed", "herdr", "jetbrains"];
    const r = await run(ids);
    expect((await tree(r.home)).length).toBe(5);
    const un = await $`sh ${script} --uninstall ${ids}`.env(homeEnv(r.home)).quiet().nothrow();
    expect(un.exitCode, un.stderr.toString()).toBe(0);
    expect(un.stdout.toString()).toContain("removed ~/");
    expect(await tree(r.home)).toEqual([]);
  });

  test("the uninstall word works like the flag, and prints what to undo by hand", async () => {
    const r = await run(["ghostty"]);
    const un = await $`sh ${script} uninstall ghostty`.env(homeEnv(r.home)).quiet().nothrow();
    expect(un.stdout.toString()).toContain(
      "Remove `theme = Bigface` from ~/.config/ghostty/config.",
    );
    expect(await tree(r.home)).toEqual([]);
  });

  test("uninstalling something that isn't installed is harmless", async () => {
    const r = await run(["--uninstall", "zed"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("not installed:");
  });

  test("--dry-run --uninstall removes nothing", async () => {
    const r = await run(["zed"]);
    const un = await $`sh ${script} --dry-run --uninstall zed`
      .env(homeEnv(r.home))
      .quiet()
      .nothrow();
    expect(un.stdout.toString()).toContain("would remove ~/");
    expect(await tree(r.home)).toEqual([".config/zed/themes/bigface.json"]);
  });

  test("`--uninstall all` removes only what is installed", async () => {
    const r = await run(["pi", "zed"]);
    await mkdir(join(r.home, ".config/zed/themes"), { recursive: true });
    await writeFile(join(r.home, ".config/zed/themes/mine.json"), "mine");
    const un = await $`sh ${script} --uninstall all`.env(homeEnv(r.home)).quiet().nothrow();
    expect(un.exitCode, un.stderr.toString()).toBe(0);
    expect(await tree(r.home)).toEqual([".config/zed/themes/mine.json"]);
  });

  test("`--uninstall all` with nothing installed says so", async () => {
    const r = await run(["--uninstall", "all"]);
    expect(r.code).toBe(0);
    expect(r.out).toContain("nothing to uninstall");
  });

  test("vscode: code and cursor receive --uninstall-extension", async () => {
    const bin = await mkdtemp(join(tmpdir(), "bf-bin-"));
    const log = join(bin, "calls.log");
    for (const name of ["code", "cursor"]) {
      await writeFile(join(bin, name), `#!/bin/sh\necho "${name} $1 $2" >> "${log}"\n`);
      await chmod(join(bin, name), 0o755);
    }
    const r = await run(["--uninstall", "vscode"], {}, bin);
    expect(r.code, r.out).toBe(0);
    expect((await Bun.file(log).text()).trim().split("\n")).toEqual([
      "code --uninstall-extension gjuoun.bigface-theme",
      "cursor --uninstall-extension gjuoun.bigface-theme",
    ]);
  });

  test("obsidian uninstall removes the theme folder it made, not the vault", async () => {
    const vault = await mkdtemp(join(tmpdir(), "bf-vault-"));
    await writeFile(join(vault, "note.md"), "my note");
    await run(["obsidian"], { BIGFACE_VAULT: vault });
    const r = await run(["--uninstall", "obsidian"], { BIGFACE_VAULT: vault });
    expect(r.code, r.out).toBe(0);
    expect(await tree(vault)).toEqual(["note.md"]);
    expect(await readdir(join(vault, ".obsidian/themes"))).toEqual([]);
  });

});

describe("interactive menu", () => {
  test("install: pick by number and by name, confirm, files appear", async () => {
    const r = await ask("1\n2, zed\ny\n");
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("What do you want to do?");
    expect(r.out).toContain("install: ghostty zed");
    expect(await tree(r.home)).toEqual([
      ".config/ghostty/themes/Bigface",
      ".config/zed/themes/bigface.json",
    ]);
  });

  test("the menu marks installed and detected apps", async () => {
    const home = (await run(["zed"])).home;
    const apps = join(home, "Applications");
    await mkdir(join(apps, "Ghostty.app"), { recursive: true });
    const answers = join(home, "answers");
    await writeFile(answers, "1\nq\n");
    const r = await $`sh ${script}`
      .env({
        HOME: home,
        PATH: basic,
        BIGFACE_BASE: `file://${site}`,
        BIGFACE_APPS: apps,
        BIGFACE_TTY: answers,
      })
      .quiet()
      .nothrow();
    const out = r.stdout.toString();
    expect(out).toMatch(/5\) zed\s+installed/);
    expect(out).toMatch(/2\) ghostty\s+detected/);
    expect(out).toMatch(/3\) herdr\s{2,}downloads/);
  });

  test("uninstall: choose 2, pick an app, confirm, file is gone", async () => {
    const home = (await run(["zed", "ghostty"])).home;
    const answers = join(home, "answers");
    await writeFile(answers, "2\nzed\ny\n");
    const r = await $`sh ${script}`
      .env({ HOME: home, PATH: basic, BIGFACE_BASE: `file://${site}`, BIGFACE_TTY: answers })
      .quiet()
      .nothrow();
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(await tree(home)).toEqual([".config/ghostty/themes/Bigface", "answers"]);
  });

  test("Enter at the app prompt means all detected", async () => {
    const home = await mkdtemp(join(tmpdir(), "bf-inst-home-"));
    const apps = join(home, "Applications");
    await mkdir(join(apps, "Ghostty.app"), { recursive: true });
    await mkdir(join(home, ".config/zed"), { recursive: true });
    const answers = join(home, "answers");
    await writeFile(answers, "\n\n\n");
    const r = await $`sh ${script}`
      .env({
        HOME: home,
        PATH: basic,
        BIGFACE_BASE: `file://${site}`,
        BIGFACE_APPS: apps,
        BIGFACE_TTY: answers,
      })
      .quiet()
      .nothrow();
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect((await tree(home)).filter((f) => f !== "answers")).toEqual([
      ".config/ghostty/themes/Bigface",
      ".config/zed/themes/bigface.json",
    ]);
  });

  test("answering n at the confirmation changes nothing", async () => {
    const r = await ask("1\nghostty\nn\n");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Nothing changed.");
    expect(await tree(r.home)).toEqual([]);
  });

  test("q, or the input ending, changes nothing and does not hang", async () => {
    for (const answers of ["q\n", "", "1\n"]) {
      const r = await ask(answers);
      expect(r.code, r.out).toBe(0);
      expect(await tree(r.home)).toEqual([]);
    }
  });

  test("an unknown name asks again instead of failing", async () => {
    const r = await ask("1\nnope\nghostty\ny\n");
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("not an app: nope");
    expect(await tree(r.home)).toEqual([".config/ghostty/themes/Bigface"]);
  });

  test("--uninstall skips the first question; --dry-run writes nothing", async () => {
    const r = await ask("zed\ny\n", ["--dry-run"]);
    expect(r.out).toContain("What do you want to do?");
    const u = await ask("q\n", ["--uninstall"]);
    expect(u.out).not.toContain("What do you want to do?");
    expect(u.out).toContain("uninstall which?");
    const d = await ask("1\nzed\ny\n", ["--dry-run"]);
    expect(d.out).toContain("would write ~/");
    expect(await tree(d.home)).toEqual([]);
  });

  test("obsidian asks for the vault path when it isn't set", async () => {
    const vault = await mkdtemp(join(tmpdir(), "bf-vault-"));
    const r = await ask(`1\nobsidian\ny\n${vault}\n`);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain("Path to your Obsidian vault");
    expect(await Bun.file(join(vault, ".obsidian/themes/Bigface/theme.css")).exists()).toBe(true);
  });

  test("works when the script itself arrives on stdin, as with `curl | sh`", async () => {
    const home = await mkdtemp(join(tmpdir(), "bf-inst-home-"));
    const answers = join(home, "answers");
    await writeFile(answers, "1\nzed\ny\n");
    const r = await $`cat ${script} | sh`
      .env({ HOME: home, PATH: basic, BIGFACE_BASE: `file://${site}`, BIGFACE_TTY: answers })
      .quiet()
      .nothrow();
    expect(r.exitCode, r.stderr.toString()).toBe(0);
    expect(await Bun.file(join(home, ".config/zed/themes/bigface.json")).exists()).toBe(true);
  });
});
