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
  screenshot?: {
    file: string;
    alt: string;
    width: number;
    height: number;
    /** Overrides the default "a real screenshot" line. */
    caption?: string;
  };
  /** The platform's own gallery listing, when the theme is published there. */
  market?: { label: string; url: string };
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
    screenshot: {
      file: "img/apps/ghostty.png",
      alt: "Ghostty running the Bigface theme: a dark green-grey window with the palette's sixteen ANSI colours as dots, the theme list and a TypeScript file.",
      width: 556,
      height: 345,
    },
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
    screenshot: {
      file: "img/apps/herdr.png",
      alt: "herdr with the Bigface theme: the spaces sidebar, the active space row, the tab strip and the pane border all in the palette's colours.",
      width: 1100,
      height: 330,
    },
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
    screenshot: {
      file: "img/apps/vscode.png",
      alt: "VS Code with Bigface: blue keywords, cream function names and yellow strings on the theme's green-grey background, with a small TypeScript project in the explorer.",
      width: 758,
      height: 303,
    },
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
    screenshot: {
      file: "img/apps/zed.png",
      alt: "Zed with the Bigface theme: blue keywords, cream function calls, pale blue constants such as ENDPOINT, yellow strings and cyan types, with the project panel on the right.",
      width: 1100,
      height: 424,
    },
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
    market: {
      label: "JetBrains Marketplace",
      url: "https://plugins.jetbrains.com/plugin/10988-bigface-color-scheme",
    },
    screenshot: {
      file: "img/apps/jetbrains.png",
      alt: "IntelliJ IDEA using the Bigface .icls scheme: blue keywords, cream function calls, yellow strings, cyan types on the theme's green-grey background.",
      width: 758,
      height: 264,
    },
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
      alt: "Obsidian in reading view with Bigface: cream headings, orange list markers, a purple blockquote, a table, info and warning callouts and a highlighted code block on a dark green-gray background.",
      width: 1514,
      height: 1362,
    },
  },
];

export const byId = (id: string): Target => {
  const t = targets.find((x) => x.id === id);
  if (!t) throw new Error(`unknown target ${id}`);
  return t;
};
