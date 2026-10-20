# Bigface

A dark color theme with **one palette and 14 ports**. It started in 2018 as a
[JetBrains scheme](https://plugins.jetbrains.com/plugin/10988-bigface-color-scheme) and is now
generated for your terminal, editors, shell and notes from [`palette/bigface.json`](palette/bigface.json).

Site, previews and install steps: **https://bigface.qqntt.com/** — served by Cloudflare Pages from
the root of that domain; every push to `main` builds and deploys it.

The site is a **blue stage**, not a copy of the theme's own background: every swatch, code sample and
preview on it is the exact palette, but the chrome is deep blue so the colours read as an object. The
mark — a polar bear on a blue field — and its export/validation pipeline live in
[`brand/`](brand/README.md).

| | |
|---|---|
| Background | `#252925` |
| Text | `#d9d9d4` |
| Keywords, links | `#00b0ff` |
| Functions, headings | `#c6ff00` |
| Strings, inline code | `#e5e500` |
| Numbers | `#fc5d23` |

Dark only, no variants. Colours are never adjusted per tool or for contrast: every colour that came
from the 2018 scheme is checked against the original XML by a test. A few roles (`fgDim`, `comment`)
are low-contrast by design.

## Install

```sh
curl -fsSL https://bigface.qqntt.com/install.sh | sh
```

With no arguments it is interactive: it asks whether to install or uninstall, shows every app marked
`installed` or `detected`, and lets you pick by number or name (Enter = all detected). Or skip the questions:

```sh
curl -fsSL https://bigface.qqntt.com/install.sh | sh -s -- ghostty tmux zed
curl -fsSL https://bigface.qqntt.com/install.sh | sh -s -- all                # every supported app it detects
curl -fsSL https://bigface.qqntt.com/install.sh | sh -s -- --uninstall all   # remove what it installed
curl -fsSL https://bigface.qqntt.com/install.sh | sh -s -- --list
```

The installer writes (and on uninstall removes) Bigface's own files only, for example
`~/.config/ghostty/themes/Bigface`. It never edits your config: it prints the one line you still need to add
or remove. Add `--dry-run` to see what it would do, or read the script first: it is generated from
[`src/installer.ts`](src/installer.ts). Apps with no drop-in location (herdr, starship, JetBrains) are
downloaded to `~/.config/bigface/<app>/` with the steps printed; Obsidian needs `BIGFACE_VAULT=/path/to/vault`
(the interactive mode asks for it). Slack writes nothing to disk.

## Apps

| App | Files | Checked by |
|---|---|---|
| pi | `themes/pi/bigface.json` | pi's theme loader |
| Ghostty | `themes/ghostty/Bigface` | `ghostty +validate-config` |
| herdr | `themes/herdr/theme.toml` | `herdr config check` |
| VS Code / Cursor | `themes/vscode/` | `vsce package` + `code --install-extension` |
| Zed | `themes/zed/` | Zed's published JSON schema |
| JetBrains | `themes/jetbrains/Bigface.xml` | identical to the original scheme |
| zellij | `themes/zellij/bigface.kdl` | `zellij setup --check` |
| starship | `themes/starship/palette.toml` | `starship print-config` |
| tmux | `themes/tmux/bigface.conf` | tmux loads it |
| Vim / Neovim | `themes/vim/colors/bigface.vim` | vim loads it, `hi Normal` |
| Xcode | `themes/xcode/Bigface.xccolortheme` | `plutil -lint` + Xcode's own key set |
| micro | `themes/micro/bigface.micro` | format test only |
| Obsidian | `themes/obsidian/Bigface/` | format test only |
| Slack | `themes/slack/theme.txt` | format test only |

The site's app pages say exactly how far each theme was checked. "Format test only" means the file
matches the tool's documented format; it was not opened in the app.

## Develop

```sh
bun install
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib bun run brand        # mark → favicons, site copies, OG card
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib bun run brand:check  # sizes, opacity, contrast, ink survival
bun run themes      # regenerate themes/ from the palette
bun run contrast    # print contrast ratios (informational)
bun run check       # typecheck + biome + all tests (tools that aren't installed are skipped)
bun run site:dev    # Astro site on http://localhost:4321/
```

To add an app: write a generator in `src/generators/`, register it in `src/targets.ts`, add its page
data to `site/src/data/targets.ts`, and run `bun run themes`. `bun run check` fails if `themes/` is
out of date.

## License

MIT
