// Copies the generated themes into public/ so every download link on the site works, and packs the
// VS Code extension. Run before `astro build` (see package.json).
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { $ } from "bun";
import { renderInstaller } from "../../src/installer.ts";

const root = join(import.meta.dir, "../..");
const pub = join(import.meta.dir, "../public");

await rm(join(pub, "themes"), { recursive: true, force: true });
await rm(join(pub, "downloads"), { recursive: true, force: true });
await mkdir(join(pub, "downloads"), { recursive: true });
await cp(join(root, "themes"), join(pub, "themes"), { recursive: true });

const vsix = join(pub, "downloads/bigface-theme-0.1.0.vsix");
await $`bunx @vscode/vsce package --no-dependencies -o ${vsix}`
  .cwd(join(root, "themes/vscode"))
  .quiet();
await Bun.write(join(pub, "install.sh"), renderInstaller());
console.log(`synced themes → public/themes, packed ${vsix}`);
