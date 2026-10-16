import { ghostty } from "./generators/ghostty.ts";
import { herdr } from "./generators/herdr.ts";
import { jetbrains } from "./generators/jetbrains.ts";
import { pi } from "./generators/pi.ts";
import type { Target } from "./generators/types.ts";
import { vscode } from "./generators/vscode.ts";
import { zed } from "./generators/zed.ts";

/** Every target, in display order. Add new generators here. */
export const targets: Target[] = [pi, ghostty, herdr, vscode, zed, jetbrains];
