import type { Palette } from "../palette.ts";

/** One tool's theme. `files` maps a path (relative to `themes/<id>/`) to its contents. */
export interface Target {
  /** Folder under `themes/` and the page slug on the site. */
  id: string;
  /** Display name of the tool. */
  name: string;
  files(p: Palette): Record<string, string>;
}
