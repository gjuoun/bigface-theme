// Proves site/src/components/ui/* is still exactly what `shadcn add` writes, so an upgrade is just
// `bunx shadcn add <name> --overwrite`. Runs the project's own shadcn (lockfile version) with --diff
// per component. --diff exits 0 whether or not the file drifted, so the text is what counts: anything
// but "No changes." fails (fail-closed on output it does not recognise). Needs the network; not part of
// CI `check` — run it in build rounds: `bun run --cwd site ui:drift`.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const site = join(import.meta.dir, "..");
const uiDir = join(site, "src/components/ui");
let names: string[] = [];
try {
  names = readdirSync(uiDir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.replace(/\.tsx$/, ""))
    .sort();
} catch {
  names = [];
}

const drifted: string[] = [];
for (const name of names) {
  const r = await $`bunx --bun shadcn add ${name} --diff`.cwd(site).nothrow().quiet();
  const text = r.stdout.toString() + r.stderr.toString();
  const ok = r.exitCode === 0 && /No changes\./.test(text) && !/^\s*│ │ [-+]/m.test(text);
  if (ok) {
    console.log(`${name}: No changes.`);
  } else {
    drifted.push(name);
    const why = /Formatting-only/.test(text)
      ? "formatting-only changes"
      : "differs from the registry";
    console.log(`${name}: DRIFT (${why})`);
    console.log(
      text
        .split("\n")
        .filter((l) => /^\s*│ │/.test(l))
        .slice(0, 30)
        .join("\n"),
    );
  }
}

if (drifted.length) {
  console.log(`ui-drift: FAIL (${drifted.length}/${names.length}): ${drifted.join(", ")}`);
  process.exit(1);
}
console.log(`ui-drift: ok (${names.length})`);
