import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { loadPalette } from "../palette.ts";
import { starship } from "./starship.ts";
import { tmux } from "./tmux.ts";
import { zellij } from "./zellij.ts";

const p = await loadPalette();
const tmp = () => mkdtemp(join(tmpdir(), "bf-shell-"));

describe("zellij", () => {
  const block = (zellij.files(p) as Record<string, string>)["bigface.kdl"] as string;
  const have = Bun.which("zellij") !== null;
  const run = async (kdl: string) => {
    const f = join(await tmp(), "config.kdl");
    await writeFile(f, kdl);
    const r = await $`zellij --config ${f} setup --check`.quiet().nothrow();
    return r.stdout.toString() + r.stderr.toString();
  };

  test("defines every theme component with #rrggbb colours", () => {
    for (const k of [
      "text_unselected",
      "ribbon_selected",
      "frame_selected",
      "exit_code_error",
      "multiplayer_user_colors",
    ]) {
      expect(block).toContain(`${k} {`);
    }
    expect(block).toContain('"#252925"');
  });
  test.skipIf(!have)("zellij setup --check says the config is well defined", async () => {
    expect(await run(`theme "bigface"\n${block}`)).toContain("[CONFIG FILE]: Well defined.");
  });
  test.skipIf(!have)("control: a non-hex colour fails to parse", async () => {
    const out = await run(`theme "bigface"\n${block.replace('"#fc5d23"', '"nothex"')}`);
    expect(out).toContain("Failed to parse Zellij configuration");
  });
});

describe("starship", () => {
  const toml = (starship.files(p) as Record<string, string>)["palette.toml"] as string;
  const have = Bun.which("starship") !== null;
  test("palette line comes before the table and names bigface", () => {
    expect(toml.indexOf('palette = "bigface"')).toBeLessThan(toml.indexOf("[palettes.bigface]"));
    expect(toml).toContain(`green          = "${p.ansi.green.hex}"`);
    expect(toml).toContain(`bright-green   = "${p.ansi.brightGreen.hex}"`);
  });
  test.skipIf(!have)(
    "starship parses it and a `green` style renders with the palette colour",
    async () => {
      const dir = await tmp();
      const f = join(dir, "starship.toml");
      await writeFile(
        f,
        `${toml}\n[character]\nsuccess_symbol = "[OK](green)"\nformat = "$symbol"\n`,
      );
      const env = { ...process.env, STARSHIP_CONFIG: f };
      const cfg = await $`starship print-config palette`.env(env).quiet().nothrow();
      expect(cfg.stdout.toString()).toContain('palette = "bigface"');
      const out = await $`starship module character`.env(env).quiet().nothrow();
      const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(p.ansi.green.hex.slice(i, i + 2), 16));
      expect(out.stdout.toString()).toContain(`38;2;${r};${g};${b}`);
    },
  );
});

describe("tmux", () => {
  const conf = (tmux.files(p) as Record<string, string>)["bigface.conf"] as string;
  const have = Bun.which("tmux") !== null;
  test("styles use the palette", () => {
    expect(conf).toContain('set -g status-style "bg=#333333,fg=#75715e"');
  });
  test.skipIf(!have)("tmux loads it and reports the status style", async () => {
    const dir = await tmp();
    const f = join(dir, "bigface.conf");
    await writeFile(f, conf);
    const sock = `bf${process.pid}`;
    const r =
      await $`tmux -L ${sock} -f ${f} new-session -d -s t \; show -gv status-style \; show -gv pane-active-border-style \; kill-server`
        .quiet()
        .nothrow();
    expect(r.stdout.toString()).toBe("bg=#333333,fg=#75715e\nfg=#00b0ff\n");
  });
  test.skipIf(!have)("control: a bad style is rejected", async () => {
    const dir = await tmp();
    const f = join(dir, "bad.conf");
    await writeFile(f, 'set -g status-style "bg=notacolour"\n');
    const sock = `bfbad${process.pid}`;
    const r =
      await $`tmux -L ${sock} -f ${f} new-session -d -s t \; show -gv status-style \; kill-server`
        .quiet()
        .nothrow();
    expect(r.stdout.toString() + r.stderr.toString()).not.toContain("bg=notacolour\n");
  });
});
