/**
 * Renders `install.sh`, the one-curl installer served from the Pages site.
 *
 *   curl -fsSL https://gjuoun.github.io/bigface-theme/install.sh | sh -s -- ghostty tmux
 *
 * The script only writes Bigface's own files. It never edits an existing config file; it prints the
 * line you need to add instead.
 */

export const SITE = "https://gjuoun.github.io/bigface-theme";

export type InstallKind =
  /** Copy files to their standard location. Included in `all` when the app is detected. */
  | "files"
  /** Download the .vsix and hand it to `code` / `cursor`. */
  | "vsix"
  /** Needs a vault path (`BIGFACE_VAULT`). */
  | "vault"
  /** Download to ~/.config/bigface/<id>/ and print the steps (nothing safe to drop in). */
  | "manual"
  /** Print the contents (Slack). */
  | "print"
  /** Open the contents as a URL (Raycast). */
  | "open";

export interface InstallSpec {
  id: string;
  kind: InstallKind;
  /** Shell test: true when the app looks installed. Only used by `all`. */
  detect?: string;
  /** [remote path under themes/<id>/, destination]. Destinations may use $HOME and $CFG. */
  files: [remote: string, dest: string][];
  /** Printed after install: the one thing the user still has to do. */
  note: string;
}

const APPS = '"${BIGFACE_APPS:-/Applications}"';

export const installSpecs: InstallSpec[] = [
  {
    id: "pi",
    kind: "files",
    detect: 'command -v pi >/dev/null 2>&1 || [ -d "$HOME/.pi/agent" ]',
    files: [["bigface.json", "$HOME/.pi/agent/themes/bigface.json"]],
    note: "Run `pi --use-theme bigface`, or pick it under /settings -> Theme.",
  },
  {
    id: "ghostty",
    kind: "files",
    detect: `[ -d ${APPS}/Ghostty.app ] || command -v ghostty >/dev/null 2>&1 || [ -d "$CFG/ghostty" ]`,
    files: [["Bigface", "$CFG/ghostty/themes/Bigface"]],
    note: "Add `theme = Bigface` to $CFG/ghostty/config and reload.",
  },
  {
    id: "herdr",
    kind: "manual",
    files: [["theme.toml", "$CFG/bigface/herdr/theme.toml"]],
    note: "herdr has no theme-file format: paste that file into $CFG/herdr/config.toml under your [theme] table, then run `herdr config check`.",
  },
  {
    id: "vscode",
    kind: "vsix",
    detect: "command -v code >/dev/null 2>&1 || command -v cursor >/dev/null 2>&1",
    files: [],
    note: "Pick Bigface under Preferences -> Color Theme.",
  },
  {
    id: "zed",
    kind: "files",
    detect: `[ -d ${APPS}/Zed.app ] || command -v zed >/dev/null 2>&1 || [ -d "$CFG/zed" ]`,
    files: [["themes/bigface.json", "$CFG/zed/themes/bigface.json"]],
    note: "Open the theme selector (cmd-k cmd-t) and choose Bigface.",
  },
  {
    id: "jetbrains",
    kind: "manual",
    files: [["Bigface.xml", "$CFG/bigface/jetbrains/Bigface.xml"]],
    note: "In your IDE: Settings -> Editor -> Color Scheme -> gear icon -> Import Scheme..., then choose that file.",
  },
  {
    id: "zellij",
    kind: "files",
    detect: 'command -v zellij >/dev/null 2>&1 || [ -d "$CFG/zellij" ]',
    files: [["bigface.kdl", "$CFG/zellij/themes/bigface.kdl"]],
    note: 'Set `theme "bigface"` in $CFG/zellij/config.kdl.',
  },
  {
    id: "starship",
    kind: "manual",
    files: [["palette.toml", "$CFG/bigface/starship/palette.toml"]],
    note: "Paste that file at the top of $CFG/starship.toml (the `palette` line must come before any table).",
  },
  {
    id: "tmux",
    kind: "files",
    detect: 'command -v tmux >/dev/null 2>&1 || [ -f "$HOME/.tmux.conf" ] || [ -d "$CFG/tmux" ]',
    files: [["bigface.conf", "$CFG/tmux/bigface.conf"]],
    note: "Add `source-file $CFG/tmux/bigface.conf` to ~/.tmux.conf, then `tmux source ~/.tmux.conf`.",
  },
  {
    id: "vim",
    kind: "files",
    detect: "command -v vim >/dev/null 2>&1 || command -v nvim >/dev/null 2>&1",
    files: [
      ["colors/bigface.vim", "$HOME/.vim/colors/bigface.vim"],
      ["colors/bigface.vim", "$CFG/nvim/colors/bigface.vim"],
    ],
    note: "Run `:colorscheme bigface`.",
  },
  {
    id: "xcode",
    kind: "files",
    detect: `[ -d ${APPS}/Xcode.app ]`,
    files: [
      [
        "Bigface.xccolortheme",
        "$HOME/Library/Developer/Xcode/UserData/FontAndColorThemes/Bigface.xccolortheme",
      ],
    ],
    note: "Restart Xcode, then choose Bigface in Settings -> Themes.",
  },
  {
    id: "micro",
    kind: "files",
    detect: 'command -v micro >/dev/null 2>&1 || [ -d "$CFG/micro" ]',
    files: [["bigface.micro", "$CFG/micro/colorschemes/bigface.micro"]],
    note: "In micro press ctrl-e and run `set colorscheme bigface` (needs COLORTERM=truecolor).",
  },
  {
    id: "obsidian",
    kind: "vault",
    files: [
      ["Bigface/theme.css", "$BIGFACE_VAULT/.obsidian/themes/Bigface/theme.css"],
      ["Bigface/manifest.json", "$BIGFACE_VAULT/.obsidian/themes/Bigface/manifest.json"],
    ],
    note: "Select Bigface under Settings -> Appearance -> Themes. Needs BIGFACE_VAULT=/path/to/vault.",
  },
  {
    id: "slack",
    kind: "print",
    files: [["theme.txt", ""]],
    note: "Paste it in Preferences -> Appearance -> Custom theme -> Import theme.",
  },
  {
    id: "raycast",
    kind: "open",
    files: [["theme.url", ""]],
    note: "Raycast asks to add the theme; accept it and pick Bigface in Settings -> Appearance.",
  },
];

/** Single-quote a string for sh. */
const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
/** Double-quote for sh, keeping $VARS live. */
const dq = (s: string) => `"${s.replace(/(["\\`])/g, "\\$1")}"`;

function installFn(s: InstallSpec): string {
  const head = `install_${s.id}() {`;
  const note = `  note ${dq(s.note)}`;
  switch (s.kind) {
    case "files":
    case "manual":
      return [
        head,
        ...s.files.map(([r, d]) => `  put ${sq(`themes/${s.id}/${r}`)} ${dq(d)} || return 1`),
        note,
        "}",
      ].join("\n");
    case "vault":
      return [
        head,
        '  if [ -z "${BIGFACE_VAULT:-}" ]; then',
        '    echo "  obsidian: set BIGFACE_VAULT=/path/to/your/vault and run again." >&2',
        "    return 1",
        "  fi",
        '  if [ ! -d "$BIGFACE_VAULT" ]; then',
        '    echo "  obsidian: $BIGFACE_VAULT is not a directory." >&2',
        "    return 1",
        "  fi",
        ...s.files.map(([r, d]) => `  put ${sq(`themes/${s.id}/${r}`)} ${dq(d)} || return 1`),
        note,
        "}",
      ].join("\n");
    case "vsix":
      return [
        head,
        `  if [ -n "$DRY" ]; then`,
        `    echo "  would download downloads/bigface-theme-0.1.0.vsix and run: code/cursor --install-extension"`,
        `  else`,
        `    tmp="$(mktemp -d)"`,
        `    trap 'rm -rf "$tmp"' EXIT`,
        `    get 'downloads/bigface-theme-0.1.0.vsix' "$tmp/bigface-theme.vsix"`,
        `    found=""`,
        `    for editor in code cursor; do`,
        `      if command -v "$editor" >/dev/null 2>&1; then`,
        `        "$editor" --install-extension "$tmp/bigface-theme.vsix" >/dev/null && echo "  installed in $editor"`,
        `        found=1`,
        `      fi`,
        `    done`,
        `    if [ -z "$found" ]; then`,
        '      echo "  neither code nor cursor is on PATH; download $BASE/downloads/bigface-theme-0.1.0.vsix and use Extensions -> Install from VSIX." >&2',
        `      return 1`,
        `    fi`,
        `  fi`,
        note,
        "}",
      ].join("\n");
    case "print":
      return [
        head,
        `  if [ -n "$DRY" ]; then echo "  would print ${s.id} theme"; else`,
        `    echo "  $(get ${sq(`themes/${s.id}/${s.files[0]?.[0]}`)} -)"`,
        `  fi`,
        note,
        "}",
      ].join("\n");
    case "open":
      return [
        head,
        `  url="$(get ${sq(`themes/${s.id}/${s.files[0]?.[0]}`)} - | tr -d '\\n')"`,
        `  if [ -n "$DRY" ]; then echo "  would open: $url"`,
        `  elif command -v open >/dev/null 2>&1; then open "$url"`,
        `  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"`,
        `  else echo "  open this link: $url"; fi`,
        note,
        "}",
      ].join("\n");
  }
}

export function renderInstaller(base = SITE): string {
  const ids = installSpecs.map((s) => s.id);
  const list = installSpecs
    .map((s) => `  printf '  %-10s %s\\n' ${sq(s.id)} ${sq(describe(s))}`)
    .join("\n");
  const detectCases = installSpecs
    .filter((s) => s.kind === "files" || s.kind === "vsix")
    .map((s) => `    ${s.id}) ${s.detect} ;;`)
    .join("\n");
  const allIds = installSpecs
    .filter((s) => s.kind === "files" || s.kind === "vsix")
    .map((s) => s.id)
    .join(" ");

  return `#!/bin/sh
# Bigface installer — https://github.com/gjuoun/bigface-theme
#
#   curl -fsSL ${base}/install.sh | sh -s -- ghostty tmux
#   curl -fsSL ${base}/install.sh | sh -s -- all          # every drop-in app it detects
#   curl -fsSL ${base}/install.sh | sh -s -- --list
#   curl -fsSL ${base}/install.sh | sh -s -- --dry-run all
#
# It only writes Bigface's own files (never edits your config) and prints the one line you still
# need to add. Read it first: it is this file.
#
# Environment: BIGFACE_BASE (site URL), BIGFACE_DRY_RUN=1, BIGFACE_VAULT (Obsidian vault path).
# Generated by src/installer.ts — do not edit by hand.
set -eu

BASE="\${BIGFACE_BASE:-${base}}"
DRY="\${BIGFACE_DRY_RUN:-}"
CFG="\${XDG_CONFIG_HOME:-$HOME/.config}"
IDS="${ids.join(" ")}"
ALL="${allIds}"

usage() {
  echo "usage: sh install.sh [--dry-run] [--list] <app>... | all"
}

list() {
  echo "Bigface apps:"
${list}
}

# get <remote path> <dest | ->   download from the site
get() {
  if [ "$2" = "-" ]; then curl -fsSL "$BASE/$1"; else curl -fsSL "$BASE/$1" -o "$2"; fi
}

# put <remote path> <dest file>
put() {
  dest="$2"
  if [ -n "$DRY" ]; then echo "  would write $dest"; return 0; fi
  mkdir -p "$(dirname "$dest")"
  part="$dest.part.$$"
  if get "$1" "$part"; then mv "$part" "$dest"; echo "  wrote $(tilde "$dest")"
  else rm -f "$part"; echo "  failed to download $1" >&2; return 1; fi
}

# Show $HOME as ~ so the output stays short.
tilde() {
  rest="$1"; out=""
  while :; do
    case "$rest" in
      *"$HOME"*) out="$out\${rest%%"$HOME"*}~"; rest="\${rest#*"$HOME"}" ;;
      *) out="$out$rest"; break ;;
    esac
  done
  printf '%s\n' "$out"
}
note() { echo "  -> $(tilde "$1")"; }

detected() {
  case "$1" in
${detectCases}
    *) return 1 ;;
  esac
}

${installSpecs.map(installFn).join("\n\n")}

valid() { case " $IDS " in *" $1 "*) return 0 ;; esac; return 1; }

targets=""
want_all=""
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --list) list; exit 0 ;;
    -n|--dry-run) DRY=1 ;;
    all)
      want_all=1
      for a in $ALL; do if detected "$a"; then targets="$targets $a"; fi; done ;;
    -*) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
    *) targets="$targets $1" ;;
  esac
  shift
done

if [ -z "$targets" ]; then
  if [ -n "$want_all" ]; then echo "no supported apps detected; name one explicitly (see --list)."; exit 0; fi
  usage; echo; list; exit 0
fi

# Reject unknown names before writing anything.
for t in $targets; do
  if ! valid "$t"; then echo "unknown app: $t (try --list)" >&2; exit 2; fi
done

status=0
done_list=" "
for t in $targets; do
  case "$done_list" in *" $t "*) continue ;; esac
  done_list="$done_list$t "
  echo "$t"
  if "install_$t"; then :; else status=1; fi
done
exit $status
`;
}

function describe(s: InstallSpec): string {
  switch (s.kind) {
    case "files":
      return "installs the theme file";
    case "vsix":
      return "installs the extension into code and cursor";
    case "vault":
      return "needs BIGFACE_VAULT=/path/to/vault";
    case "manual":
      return "downloads the file and prints the steps";
    case "print":
      return "prints the theme string";
    case "open":
      return "opens the import link";
  }
}
