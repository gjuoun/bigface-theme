import { ghostty } from "./generators/ghostty.ts";
import { herdr } from "./generators/herdr.ts";
import { jetbrains } from "./generators/jetbrains.ts";
import { micro } from "./generators/micro.ts";
import { obsidian } from "./generators/obsidian.ts";
import { pi } from "./generators/pi.ts";
import { raycast } from "./generators/raycast.ts";
import { slack } from "./generators/slack.ts";
import { starship } from "./generators/starship.ts";
import { tmux } from "./generators/tmux.ts";
import type { Target } from "./generators/types.ts";
import { vim } from "./generators/vim.ts";
import { vscode } from "./generators/vscode.ts";
import { xcode } from "./generators/xcode.ts";
import { zed } from "./generators/zed.ts";
import { zellij } from "./generators/zellij.ts";

/** Every target, in display order. Add new generators here. */
export const targets: Target[] = [
  pi,
  ghostty,
  herdr,
  vscode,
  zed,
  jetbrains,
  zellij,
  starship,
  tmux,
  vim,
  xcode,
  micro,
  obsidian,
  slack,
  raycast,
];
