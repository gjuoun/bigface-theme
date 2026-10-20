export type Check = "tool" | "schema" | "format";

export interface Target {
  id: string;
  name: string;
  kind: "Terminal" | "Editor" | "IDE" | "Shell" | "Notes" | "Chat" | "Agent";
  tagline: string;
  /** Files under themes/<id>/ offered for download; the first is the main one. */
  files: { path: string; label: string }[];
  /** Optional extra build output copied into the site (e.g. the packaged .vsix). */
  download?: { href: string; label: string };
  steps: string[];
  /** What the test suite proves for this target — shown on its page, so no claim is stronger than the proof. */
  check: { level: Check; text: string };
  terminalPreview: boolean;
  /** A real screenshot of the theme in the app (under public/img/). */
  screenshot?: { file: string; alt: string; width: number; height: number };
}

export const REPO = "https://github.com/gjuoun/bigface-theme";
// The install one-liner names the host that actually serves install.sh.
export const SITE_URL = "https://bigface.qqntt.com";
export const installCommand = (what = "") =>
  what
    ? `curl -fsSL ${SITE_URL}/install.sh | sh -s -- ${what}`
    : `curl -fsSL ${SITE_URL}/install.sh | sh`;
export const rawUrl = (id: string, path: string) =>
  `https://raw.githubusercontent.com/gjuoun/bigface-theme/main/themes/${id}/${path}`;

export const targets: Target[] = [
  {
    id: "pi",
    name: "pi",
    kind: "Agent",
    tagline: "Theme for the pi coding agent TUI.",
    files: [{ path: "bigface.json", label: "bigface.json" }],
    steps: [
      "Copy `bigface.json` to `~/.pi/agent/themes/`.",
      "Run `pi --use-theme bigface` for one session, or pick it under `/settings` → Theme.",
    ],
    check: {
      level: "tool",
      text: "Loaded by pi's own theme loader; an 8-digit hex is rejected by the same loader.",
    },
    terminalPreview: true,
  },
  {
    id: "ghostty",
    name: "Ghostty",
    kind: "Terminal",
    tagline: "Background, foreground, selection, cursor and the 16-colour palette.",
    files: [{ path: "Bigface", label: "Bigface" }],
    steps: [
      "Copy `Bigface` to `~/.config/ghostty/themes/`.",
      "Add `theme = Bigface` to `~/.config/ghostty/config` and reload the config.",
    ],
    check: {
      level: "tool",
      text: "Accepted by `ghostty +validate-config`; a bad colour is rejected.",
    },
    terminalPreview: true,
  },
  {
    id: "herdr",
    name: "herdr",
    kind: "Terminal",
    tagline: "A `[theme.custom]` block layered on a base theme.",
    files: [{ path: "theme.toml", label: "theme.toml" }],
    steps: [
      "herdr has no theme-file format, so paste the contents of `theme.toml` into `~/.config/herdr/config.toml`, below your `[theme]` table.",
      "Run `herdr config check`, then `herdr server reload-config`.",
    ],
    check: {
      level: "tool",
      text: "`herdr config check` reports `config: ok` with a base theme plus this block. It does not validate colour values.",
    },
    terminalPreview: true,
  },
  {
    id: "vscode",
    name: "VS Code / Cursor",
    kind: "Editor",
    tagline: "A colour-theme extension. The same file works in VS Code and Cursor.",
    files: [
      { path: "themes/bigface-color-theme.json", label: "bigface-color-theme.json" },
      { path: "package.json", label: "package.json" },
    ],
    download: { href: "downloads/bigface-theme-0.1.0.vsix", label: "bigface-theme-0.1.0.vsix" },
    steps: [
      "Download the `.vsix`.",
      "Run `code --install-extension bigface-theme-0.1.0.vsix` (or `cursor --install-extension …`), or use *Extensions → … → Install from VSIX*.",
      "Open *Preferences → Color Theme* and pick **Bigface**.",
    ],
    check: {
      level: "tool",
      text: "Packaged with `vsce` and installed with `code --install-extension` into a scratch extensions directory.",
    },
    terminalPreview: false,
  },
  {
    id: "zed",
    name: "Zed",
    kind: "Editor",
    tagline: "A Zed theme family (schema v0.2.0).",
    files: [{ path: "themes/bigface.json", label: "bigface.json" }],
    steps: [
      "Copy `bigface.json` to `~/.config/zed/themes/`.",
      "Open the theme selector (`cmd-k cmd-t`) and choose **Bigface**.",
      "Or run *zed: install dev extension* and select the `themes/zed` folder of this repo.",
    ],
    check: {
      level: "schema",
      text: "Validated against Zed's published theme schema; not loaded inside Zed.",
    },
    terminalPreview: false,
  },
  {
    id: "jetbrains",
    name: "JetBrains IDEs",
    kind: "IDE",
    tagline:
      "The original 2018 scheme: IntelliJ IDEA, WebStorm, PyCharm, Android Studio, DataGrip.",
    files: [{ path: "Bigface.xml", label: "Bigface.xml" }],
    steps: [
      "Open *Settings → Editor → Color Scheme*.",
      "Click the gear icon → *Import Scheme…* and choose `Bigface.xml`.",
    ],
    check: {
      level: "tool",
      text: "Regenerated from the palette; colour for colour identical to the original scheme file.",
    },
    terminalPreview: false,
  },
  {
    id: "zellij",
    name: "zellij",
    kind: "Terminal",
    tagline: "A theme block for the zellij terminal workspace.",
    files: [{ path: "bigface.kdl", label: "bigface.kdl" }],
    steps: [
      "Copy `bigface.kdl` to `~/.config/zellij/themes/`.",
      'Set `theme "bigface"` in `~/.config/zellij/config.kdl`.',
    ],
    check: {
      level: "tool",
      text: "`zellij setup --check` reports the config is well defined; a non-hex colour is rejected.",
    },
    terminalPreview: true,
  },
  {
    id: "starship",
    name: "starship",
    kind: "Shell",
    tagline: "A starship palette that recolours the standard colour names.",
    files: [{ path: "palette.toml", label: "palette.toml" }],
    steps: [
      "Paste `palette.toml` at the top of `~/.config/starship.toml` (the `palette` line must come before any table).",
      "Open a new prompt. Modules that use `green`, `cyan`, … now render in Bigface colours.",
    ],
    check: {
      level: "tool",
      text: "`starship print-config` reads it, and a `green` style renders as the palette's green.",
    },
    terminalPreview: true,
  },
  {
    id: "tmux",
    name: "tmux",
    kind: "Shell",
    tagline: "Status line, pane borders, messages and copy-mode colours.",
    files: [{ path: "bigface.conf", label: "bigface.conf" }],
    steps: [
      "Copy `bigface.conf` to `~/.config/tmux/bigface.conf`.",
      "Add `source-file ~/.config/tmux/bigface.conf` to `~/.tmux.conf`, then `tmux source ~/.tmux.conf`.",
    ],
    check: {
      level: "tool",
      text: "Loaded by tmux 3.7; `show -gv status-style` returns the palette colours and a bad style is rejected.",
    },
    terminalPreview: true,
  },
  {
    id: "vim",
    name: "Vim / Neovim",
    kind: "Editor",
    tagline: "A single `colors/bigface.vim` file, with terminal ANSI colours.",
    files: [{ path: "colors/bigface.vim", label: "bigface.vim" }],
    steps: [
      "Copy it to `~/.vim/colors/bigface.vim` (Neovim: `~/.config/nvim/colors/`).",
      "Run `:colorscheme bigface`. It sets `termguicolors` when available.",
    ],
    check: {
      level: "tool",
      text: "vim loads it headless and `hi Normal` reports the palette's foreground and background.",
    },
    terminalPreview: false,
  },
  {
    id: "xcode",
    name: "Xcode",
    kind: "IDE",
    tagline: "A source-editor and console theme.",
    files: [{ path: "Bigface.xccolortheme", label: "Bigface.xccolortheme" }],
    steps: [
      "Run `mkdir -p ~/Library/Developer/Xcode/UserData/FontAndColorThemes`.",
      "Copy `Bigface.xccolortheme` into it and restart Xcode.",
      "Open *Xcode → Settings → Themes* and choose **Bigface**.",
    ],
    check: {
      level: "tool",
      text: "`plutil -lint` passes and every key in Xcode's own *Default (Dark)* theme is present. Not opened in Xcode.",
    },
    terminalPreview: false,
  },
  {
    id: "micro",
    name: "micro",
    kind: "Editor",
    tagline: "A colour scheme for the micro terminal editor.",
    files: [{ path: "bigface.micro", label: "bigface.micro" }],
    steps: [
      "Copy `bigface.micro` to `~/.config/micro/colorschemes/`.",
      "In micro press `ctrl-e` and run `set colorscheme bigface`. Needs a truecolor terminal (`COLORTERM=truecolor`).",
    ],
    check: {
      level: "format",
      text: "Format-checked against micro's documented syntax. micro is not installed here, so it was not run.",
    },
    terminalPreview: false,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    kind: "Notes",
    tagline: "A dark theme overriding Obsidian's colour variables.",
    files: [
      { path: "Bigface/theme.css", label: "theme.css" },
      { path: "Bigface/manifest.json", label: "manifest.json" },
    ],
    steps: [
      "Create `<your vault>/.obsidian/themes/Bigface/` and put `theme.css` and `manifest.json` in it.",
      "Open *Settings → Appearance → Themes* and select **Bigface**.",
    ],
    check: {
      level: "format",
      text: "Format-checked against Obsidian's theme docs (manifest fields, folder name, `.theme-dark` variables). Not opened in Obsidian.",
    },
    terminalPreview: false,
    screenshot: {
      file: "img/obsidian-preview.png",
      alt: "Obsidian in reading view with Bigface: lime headings, orange list markers, a purple blockquote, a table, info and warning callouts and a highlighted code block on a dark green-gray background.",
      width: 1514,
      height: 1362,
    },
  },
  {
    id: "slack",
    name: "Slack",
    kind: "Chat",
    tagline: "A sidebar colour string (the legacy 8-colour format).",
    files: [{ path: "theme.txt", label: "theme.txt" }],
    steps: [
      "Open *Preferences → Appearance → Custom theme → Import theme*.",
      "Paste the contents of `theme.txt` and apply.",
    ],
    check: {
      level: "format",
      text: "Eight `#rrggbb` values in the documented order. Slack's current import of this legacy string was not tried.",
    },
    terminalPreview: false,
  },
];

export const byId = (id: string): Target => {
  const t = targets.find((x) => x.id === id);
  if (!t) throw new Error(`unknown target ${id}`);
  return t;
};
