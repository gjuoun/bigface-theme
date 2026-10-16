// Load a pi theme with pi's own loader. (`pi --theme … --list-models` never loads themes, so it
// can't prove a theme is valid — probed in Step 1.)
// usage: bun run scripts/pi-load.ts <theme.json>   → prints `ok <name>`, or `FAIL <reason>` + exit 1
import { join } from "node:path";

const THEME_MODULE = join(
  import.meta.dir,
  "../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js",
);

/** Returns the theme name, or throws pi's own validation error. */
export async function loadPiTheme(path: string): Promise<string> {
  const { loadThemeFromPath } = await import(THEME_MODULE);
  return loadThemeFromPath(path).name as string;
}

if (import.meta.main) {
  try {
    console.log(`ok ${await loadPiTheme(process.argv[2] as string)}`);
  } catch (e) {
    console.error(`FAIL ${(e as Error).message}`);
    process.exit(1);
  }
}
