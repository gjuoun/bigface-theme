import { obsidian } from "./generators/obsidian.ts";
import { pi } from "./generators/pi.ts";
import { tokens } from "./generators/tokens.ts";
import type { Target } from "./generators/types.ts";
import { vscode } from "./generators/vscode.ts";
import { zed } from "./generators/zed.ts";

/** Every target, in display order. Add new generators here. */
export const targets: Target[] = [tokens, pi, vscode, zed, obsidian];
