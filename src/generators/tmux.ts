import { type ColorName, color, type Palette } from "../palette.ts";
import type { Target } from "./types.ts";

export const tmux: Target = {
  id: "tmux",
  name: "tmux",
  files(p: Palette) {
    const c = (n: ColorName) => color(p, n);
    const lines = [
      "# Bigface — https://github.com/gjuoun/bigface-theme",
      "# Add to ~/.tmux.conf:  source-file ~/.config/tmux/bigface.conf",
      `set -g status-style "bg=${c("borderMuted")},fg=${c("comment")}"`,
      `set -g status-left-style "bg=${c("blue")},fg=${c("bg")},bold"`,
      `set -g status-right-style "bg=${c("borderMuted")},fg=${c("comment")}"`,
      `set -g window-status-style "bg=${c("borderMuted")},fg=${c("fgDim")}"`,
      `set -g window-status-current-style "bg=${c("cursorLine")},fg=${c("lime")},bold"`,
      `set -g window-status-activity-style "bg=${c("borderMuted")},fg=${c("burntOrange")}"`,
      `set -g window-status-bell-style "bg=${c("pink")},fg=${c("bg")}"`,
      `set -g pane-border-style "fg=${c("border")}"`,
      `set -g pane-active-border-style "fg=${c("blue")}"`,
      `set -g message-style "bg=${c("cursorLine")},fg=${c("fg")}"`,
      `set -g message-command-style "bg=${c("cursorLine")},fg=${c("yellow")}"`,
      `set -g mode-style "bg=${c("selection")},fg=${c("fg")}"`,
      `set -g clock-mode-colour "${c("blue")}"`,
      `set -g display-panes-colour "${c("fgDim")}"`,
      `set -g display-panes-active-colour "${c("burntOrange")}"`,
      `set -g copy-mode-match-style "bg=${c("searchBg")},fg=${c("searchFg")}"`,
      `set -g copy-mode-current-match-style "bg=${c("burntOrange")},fg=${c("bg")}"`,
    ];
    return { "bigface.conf": `${lines.join("\n")}\n` };
  },
};
